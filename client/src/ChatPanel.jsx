import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function ChatPanel({ connection, myData, onSendMessage, messages }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback((e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || !connection) return;
    onSendMessage(msg);
    setInput('');
    inputRef.current?.focus();
  }, [input, connection, onSendMessage]);

  if (!connection) return null;
  const partnerColor = connection.partner?.color || '#4f46e5';

  return (
    <div className="chat-panel">
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
          Chat with {connection.partner?.username}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
          Live Connection
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: 8 }}>This is the beginning of your chat history with {connection.partner?.username}.</div>
            <div style={{ fontSize: '0.7rem', color: '#d1d5db' }}>Messages are synchronized in real-time based on your proximity.</div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === myData?.userId;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                {!isOwn && <div style={{ fontSize: '0.65rem', color: partnerColor, fontWeight: 700, marginBottom: 4, marginLeft: 4 }}>{msg.senderName}</div>}
                <div className={`chat-bubble ${isOwn ? 'own' : 'other'}`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: '16px', borderTop: '1px solid #e5e7eb', background: 'white' }}>
        <input ref={inputRef} className="cosmos-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Send a message..." maxLength={200} style={{ fontSize: '0.85rem' }} autoComplete="off" />
        <button type="submit" disabled={!input.trim()} style={{
          background: input.trim() ? '#4f46e5' : '#e5e7eb', border: 'none', borderRadius: 8,
          color: 'white', padding: '0 16px', cursor: input.trim() ? 'pointer' : 'default', transition: 'all 0.2s'
        }}>
          ➤
        </button>
      </form>
    </div>
  );
}
