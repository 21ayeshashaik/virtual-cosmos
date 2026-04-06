import React, { useEffect, useRef } from 'react';

export default function Minimap({ myData, users, worldW = 2400, worldH = 1600 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !myData) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const scaleX = W / worldW;
    const scaleY = H / worldH;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += W / 8) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += H / 8) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Draw world elements on minimap
    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(200 * scaleX, 200 * scaleY, 160 * scaleX, 160 * scaleY); // Hub
    ctx.fillRect(1800 * scaleX, 300 * scaleY, 160 * scaleX, 160 * scaleY); // Greenhouse

    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(400 * scaleX, 1000 * scaleY, 200 * scaleX, 140 * scaleY); // Farm
    ctx.fillRect(1700 * scaleX, 1100 * scaleY, 200 * scaleX, 140 * scaleY); // Farm 2

    ctx.fillStyle = '#eff6ff';
    ctx.beginPath();
    ctx.arc(1000 * scaleX + 150 * scaleX, 600 * scaleY + 150 * scaleY, 150 * scaleX, 0, Math.PI * 2);
    ctx.fill();

    // Find the current user in the live users list to get their latest position
    // If not found yet (e.g., initial join), fall back to the initial myData
    const currentUser = users.find(u => u.userId === myData?.userId) || myData;
    
    for (const u of users) {
      // Skip the local player in this loop; we draw them with a special highlight later
      if (u.userId === myData?.userId) continue;
      
      ctx.beginPath();
      ctx.arc(u.x * scaleX, u.y * scaleY, 3, 0, Math.PI * 2);
      ctx.fillStyle = u.color;
      ctx.fill();
    }

    const lx = currentUser.x * scaleX;
    const ly = currentUser.y * scaleY;

    // Draw proximity circle around the local player
    ctx.beginPath();
    ctx.arc(lx, ly, 150 * scaleX, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw the local player dot
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = currentUser.color || '#4f46e5';
    ctx.fill();
    
    // Add a small border to make the local dot pop
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [myData, users, worldW, worldH]);

  return (
    <div className="minimap glass-sm">
      <div style={{ padding: '4px 8px', fontSize: '0.6rem', color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>
        WORLD MAP
      </div>
      <canvas ref={canvasRef} width={160} height={100} style={{ display: 'block', width: '100%' }} />
    </div>
  );
}
