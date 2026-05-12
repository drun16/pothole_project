// AdminLogin.js
import React, { useState } from 'react';

const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:5000/api/login', { // Replace with your DevTunnel/IP if testing on mobile
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Pass the token back to App.js
        onLoginSuccess(data.token);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', backgroundColor: '#1e1e1e', borderRadius: '12px', border: '2px solid #FFD700', textAlign: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
      <h2 style={{ color: '#FFD700', marginBottom: '20px' }}>Authority Login</h2>
      
      {error && <div style={{ color: '#ff4d4d', marginBottom: '15px', fontWeight: 'bold' }}>{error}</div>}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Admin Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '6px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', fontSize: '1rem' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '12px', borderRadius: '6px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', fontSize: '1rem' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '12px', backgroundColor: '#FFD700', color: '#121212', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}
        >
          {loading ? 'Verifying...' : 'Secure Login'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;