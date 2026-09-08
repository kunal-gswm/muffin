import { useState, useRef, useEffect } from 'react';

export default function ChatBox({ messages, onSendMessage, membersCount }) {
  const [isOpen, setIsOpen] = useState(true);
  const [text, setText] = useState('');
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate a random guest name if none exists
    const stored = localStorage.getItem('streambert_username');
    if (stored) {
      setUsername(stored);
    } else {
      const gen = 'Guest' + Math.floor(Math.random() * 10000);
      setUsername(gen);
      localStorage.setItem('streambert_username', gen);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(username, text);
    setText('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 100000
        }}
      >
        💬 Chat ({messages.length})
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: '2rem',
      right: '2rem',
      bottom: '12rem',
      width: '320px',
      backgroundColor: 'rgba(10, 10, 11, 0.7)',
      backdropFilter: 'blur(15px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'auto',
      zIndex: 100000,
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00ff88' }} />
          Watch Party ({membersCount})
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{m.username}</span>
            <div style={{
              backgroundColor: m.username === username ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.5)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.9rem',
              alignSelf: 'flex-start',
              maxWidth: '90%'
            }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.5rem' }}>
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something..."
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '0.5rem 1rem',
            color: 'white',
            outline: 'none'
          }}
        />
      </form>
    </div>
  );
}
