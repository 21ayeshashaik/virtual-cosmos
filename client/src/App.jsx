import React, { useEffect, useRef, useState, useCallback } from 'react';
import socket from './socket';
import CosmosGame from './CosmosGame';
import LoginScreen from './LoginScreen';
import ChatPanel from './ChatPanel';
import Minimap from './Minimap';
import './index.css';

function Toast({ text, type = 'connect' }) {
  const color = type === 'connect' ? '#059669' : '#dc2626';
  const bg = type === 'connect' ? '#ecfdf5' : '#fef2f2';
  return <div className="toast" style={{ background: bg, borderColor: color, color: color, zIndex: 300 }}>{text}</div>;
}

function TopNav({ myData }) {
  return (
    <div className="top-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>VIRTUAL COSMOS</div>
        <div style={{ padding: '4px 10px', background: '#312e81', borderRadius: '4px', fontSize: '0.75rem' }}>Space</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: '0.85rem' }}>{myData?.username}</div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: myData?.color || '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
          {myData?.username?.[0]?.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function HUD({ onlineCount, onEmote }) {
  return (
    <div className="hud">
      <div className="glass-sm" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
        <span style={{ color: '#6b7280' }}>{onlineCount} Online</span>
      </div>
      <div className="glass-sm" style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>Emotes</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['👋', '❤️', '🔥', '😂', '👍'].map((e) => (
            <button key={e} onClick={() => onEmote(e)} style={{ fontSize: '1.2rem', cursor: 'pointer', background: 'none', border: 'none', outline: 'none' }}>{e}</button>
          ))}
        </div>
      </div>
      <div className="glass-sm" style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Movement</div>
        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Click to move (High Speed)</div>
      </div>
    </div>
  );
}

function ProximityAvatars({ myData, connections }) {
  if (connections.length === 0) return null;
  const latest = connections[connections.length - 1];
  return (
    <div className="connection-avatar-bar">
      <div className="proximity-avatar">
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: myData.color, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 }}>{myData.username[0].toUpperCase()}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{myData.username}</div>
      </div>
      <div className="proximity-avatar partner">
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: latest.partner.color, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 }}>{latest.partner.username[0].toUpperCase()}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{latest.partner.username}</div>
      </div>
    </div>
  );
}

function UsersSidebar({ users, myData, activeConnections }) {
  return (
    <div className="users-list">
      <div className="glass-sm" style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>Explorers ({users.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.slice(0, 10).map((u) => {
            const isMe = u.userId === myData?.userId;
            const isConnected = activeConnections.some((c) => c.partner?.userId === u.userId);
            return (
              <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: u.color, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{u.username[0].toUpperCase()}</div>
                <span style={{ fontSize: '0.75rem', fontWeight: isMe ? 700 : 400, color: isConnected ? '#10b981' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{u.username}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [phase, setPhase] = useState('login');
  const [myData, setMyData] = useState(null);
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [chatMessages, setChatMessages] = useState({});
  const [toast, setToast] = useState(null);

  const activeConnection = connections[connections.length - 1] || null;

  const showToast = useCallback((text, type) => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); }, []);

  const usersRef = useRef(users);
  useEffect(() => { usersRef.current = users; }, [users]);

  useEffect(() => {
    socket.on('user:joined', (userData) => { setMyData(userData); });
    socket.on('users:update', (list) => { 
      setUsers(list); 
      if (gameRef.current) gameRef.current.updateUsers(list); 
    });
    socket.on('user:emote', ({ userId, emoji }) => { if (gameRef.current) gameRef.current.showEmote(userId, emoji); });
    socket.on('proximity:connected', ({ roomId, partner }) => {
      setConnections((prev) => prev.some((c) => c.roomId === roomId) ? prev : [...prev, { roomId, partner }]);
      setChatMessages((prev) => ({ ...prev, [roomId]: [] }));
      showToast(`Near ${partner.username}`, 'connect');
    });
    socket.on('proximity:disconnected', ({ roomId, partnerId }) => {
      setConnections((prev) => prev.filter((c) => c.roomId !== roomId));
      const partnerName = usersRef.current.find((u) => u.userId === partnerId)?.username || 'Explorer';
      showToast(`Away from ${partnerName}`, 'disconnect');
    });
    socket.on('chat:message', (msg) => { setChatMessages((prev) => ({ ...prev, [msg.roomId]: [...(prev[msg.roomId] || []), msg] })); });
    
    return () => { 
      socket.off('user:joined'); socket.off('users:update'); 
      socket.off('user:emote'); socket.off('proximity:connected'); 
      socket.off('proximity:disconnected'); socket.off('chat:message'); 
    };
  }, [showToast]);

  useEffect(() => {
    if (phase !== 'cosmos' || !canvasRef.current) return;
    let game;
    (async () => {
      game = new CosmosGame(canvasRef.current, { onPositionChange: ({ x, y }) => { socket.emit('user:move', { x, y }); } });
      await game.init();
      gameRef.current = game;
      if (myData) game.spawnLocalPlayer(myData);
      const handleResize = () => game.resize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    })();
    return () => { if (gameRef.current) { gameRef.current.destroy(); gameRef.current = null; } };
  }, [phase]);

  useEffect(() => { 
    if (myData && gameRef.current) {
      gameRef.current.spawnLocalPlayer(myData);
      if (users.length > 0) gameRef.current.updateUsers(users);
    } 
  }, [myData]);

  const handleJoin = useCallback((username) => { setPhase('cosmos'); socket.connect(); socket.emit('user:join', { username }); }, []);
  const handleSendMessage = useCallback((message) => { if (!activeConnection) return; socket.emit('chat:message', { roomId: activeConnection.roomId, message }); }, [activeConnection]);
  const handleEmote = useCallback((emoji) => { socket.emit('user:emote', emoji); }, []);

  const activeMessages = activeConnection ? chatMessages[activeConnection.roomId] || [] : [];

  return (
    <>
      <canvas id="cosmos-canvas" ref={canvasRef} />
      {phase === 'login' && <LoginScreen onJoin={handleJoin} />}
      {phase === 'cosmos' && myData && (
        <>
          <TopNav myData={myData} />
          <ProximityAvatars myData={myData} connections={connections} />
          <HUD onlineCount={users.length} onEmote={handleEmote} />
          <UsersSidebar users={users} myData={myData} activeConnections={connections} />
          {activeConnection && (
            <ChatPanel connection={activeConnection} myData={myData} messages={activeMessages} onSendMessage={handleSendMessage} />
          )}
          <Minimap myData={myData} users={users} />
        </>
      )}
      {toast && <Toast text={toast.text} type={toast.type} />}
    </>
  );
}
