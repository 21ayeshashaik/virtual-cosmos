import React, { useState, useCallback } from 'react';

export default function LoginScreen({ onJoin }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = useCallback((e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) {
      setError('Enter your name');
      return;
    }
    setLoading(true);
    onJoin(name);
  }, [username, onJoin]);

  return (
    <div className="login-screen" style={{ background: '#f3f4f6' }}>
      <div className="login-card">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '1rem' }}>
          Virtual Cosmos
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Proximity-based social space
        </p>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="cosmos-input"
            type="text"
            placeholder="Your name"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            maxLength={20}
            autoFocus
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'left' }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Joining...' : 'Enter Space'}
          </button>
        </form>
      </div>
    </div>
  );
}
