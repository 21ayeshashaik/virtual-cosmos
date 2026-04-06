require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/virtual-cosmos';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error', err.message));

const users = new Map();
const chatRooms = new Map();

const PROXIMITY_RADIUS = 150;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getRoomId(id1, id2) {
  return [id1, id2].sort().join(':');
}

function getRandomColor() {
  const palette = ['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function broadcastUserList() {
  io.emit('users:update', Array.from(users.values()));
}

function checkProximity(movedUser) {
  const movedSocketId = movedUser.socketId;
  for (const [otherSocketId, otherUser] of users) {
    if (otherSocketId === movedSocketId) continue;

    const dist = distance(movedUser, otherUser);
    const roomId = getRoomId(movedUser.userId, otherUser.userId);

    if (dist < PROXIMITY_RADIUS) {
      if (!chatRooms.has(roomId)) {
        chatRooms.set(roomId, new Set([movedSocketId, otherSocketId]));
        const movedSocket = io.sockets.sockets.get(movedSocketId);
        const otherSocket = io.sockets.sockets.get(otherSocketId);

        if (movedSocket) movedSocket.join(roomId);
        if (otherSocket) otherSocket.join(roomId);

        io.to(movedSocketId).emit('proximity:connected', { roomId, partner: otherUser });
        io.to(otherSocketId).emit('proximity:connected', { roomId, partner: movedUser });
      }
    } else {
      if (chatRooms.has(roomId)) {
        chatRooms.delete(roomId);
        const movedSocket = io.sockets.sockets.get(movedSocketId);
        const otherSocket = io.sockets.sockets.get(otherSocketId);

        if (movedSocket) movedSocket.leave(roomId);
        if (otherSocket) otherSocket.leave(roomId);

        io.to(movedSocketId).emit('proximity:disconnected', { roomId, partnerId: otherUser.userId });
        io.to(otherSocketId).emit('proximity:disconnected', { roomId, partnerId: movedUser.userId });
      }
    }
  }
}

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('user:join', ({ username }) => {
    const user = {
      socketId: socket.id,
      userId: uuidv4(),
      username: username || `Explorer${Math.floor(Math.random() * 9999)}`,
      x: Math.random() * (WORLD_WIDTH - 200) + 100,
      y: Math.random() * (WORLD_HEIGHT - 200) + 100,
      color: getRandomColor(),
    };
    users.set(socket.id, user);
    socket.emit('user:joined', user);
    broadcastUserList();
  });

  socket.on('user:move', ({ x, y }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.x = Math.max(20, Math.min(WORLD_WIDTH - 20, x));
    user.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, y));
    broadcastUserList();
    checkProximity(user);
  });

  socket.on('user:emote', (emoji) => {
    const user = users.get(socket.id);
    if (!user) return;
    io.emit('user:emote', { userId: user.userId, emoji });
  });

  socket.on('chat:message', ({ roomId, message }) => {
    const user = users.get(socket.id);
    if (!user || !chatRooms.has(roomId)) return;
    const room = chatRooms.get(roomId);
    if (!room.has(socket.id)) return;
    io.to(roomId).emit('chat:message', {
      id: uuidv4(),
      roomId,
      senderId: user.userId,
      senderName: user.username,
      senderColor: user.color,
      message,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      for (const [roomId, members] of chatRooms) {
        if (members.has(socket.id)) {
          const partnerId = [...members].find((id) => id !== socket.id);
          chatRooms.delete(roomId);
          if (partnerId) {
            io.to(partnerId).emit('proximity:disconnected', { roomId, partnerId: user.userId });
          }
        }
      }
      users.delete(socket.id);
      broadcastUserList();
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
