import React, { useState, useEffect } from 'react';

const TreeMessages = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState({ mood: 'Happy', language: 'Hindi', message: '', category: 'Motivation' });
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api';

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/messages/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setMessages(data.messages);
    } catch(e) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if(!newMsg.message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newMsg)
      });
      const data = await res.json();
      if(data.success) {
        setMessages([data.msg, ...messages]);
        setNewMsg({ ...newMsg, message: '' });
      }
    } catch(e) {}
    setLoading(false);
  };

  return (
    <div style={{animation: 'fadeIn 0.5s ease'}}>
      <div className="page-header">
        <h1 className="page-title">Tree Talking Messages</h1>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2.5rem', alignItems: 'start'}}>
          
          {/* Create Form */}
          <div className="data-card" style={{padding: '2.5rem', border: '1px solid #e2e8f0'}}>
              <h3 style={{marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <span>➕</span> Add New Message
              </h3>
              <form onSubmit={handleCreate}>
                  <div className="form-group">
                      <label>Mood Type</label>
                      <select className="form-control" value={newMsg.mood} onChange={e => setNewMsg({...newMsg, mood: e.target.value})}>
                          <option value="Happy">Happy (☀️)</option>
                          <option value="Waiting">Waiting (⏳)</option>
                          <option value="Sad">Sad (🌧️)</option>
                          <option value="Excited">Excited (🎉)</option>
                      </select>
                  </div>
                  <div className="form-group">
                      <label>Display Language</label>
                      <select className="form-control" value={newMsg.language} onChange={e => setNewMsg({...newMsg, language: e.target.value})}>
                          <option value="Hindi">Hindi (हिन्दी)</option>
                          <option value="English">English</option>
                      </select>
                  </div>
                  <div className="form-group">
                      <label>Message Content</label>
                      <textarea 
                        className="form-control" 
                        rows="4"
                        value={newMsg.message} 
                        onChange={e => setNewMsg({...newMsg, message: e.target.value})}
                        placeholder="e.g. आज मुझे पानी अच्छा लगा!"
                        style={{minHeight: '120px'}}
                      />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '1rem', marginTop: '1rem', fontSize: '1rem'}} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Template'}
                  </button>
              </form>
          </div>

          {/* List Display */}
          <div className="data-card" style={{border: '1px solid #e2e8f0'}}>
              <div style={{padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h3 style={{fontSize: '1.1rem', color: '#334155'}}>Stored Templates</h3>
                  <span className="badge badge-info" style={{background: '#e0f2fe', color: '#0369a1'}}>{messages.length} Total</span>
              </div>
              <div style={{maxHeight: '700px', overflowY: 'auto'}}>
                <table>
                    <thead>
                        <tr>
                            <th style={{paddingLeft: '2rem'}}>MOOD</th>
                            <th>LANG</th>
                            <th>MESSAGE</th>
                            <th style={{paddingRight: '2rem'}}>CATEGORY</th>
                        </tr>
                    </thead>
                    <tbody>
                        {messages.length > 0 ? messages.map(m => (
                            <tr key={m._id}>
                                <td style={{paddingLeft: '2rem'}}>
                                    <span className="badge" style={{
                                        backgroundColor: m.mood === 'Happy' ? '#dcfce7' : (m.mood === 'Sad' ? '#fee2e2' : (m.mood === 'Waiting' ? '#fef3c7' : '#e0f2fe')),
                                        color: m.mood === 'Happy' ? '#166534' : (m.mood === 'Sad' ? '#991b1b' : (m.mood === 'Waiting' ? '#92400e' : '#0369a1'))
                                    }}>
                                        {m.mood}
                                    </span>
                                </td>
                                <td><span style={{fontWeight: 700, color: '#475569', fontSize: '0.75rem'}}>{m.language.toUpperCase()}</span></td>
                                <td style={{fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '400px', color: '#1e293b', padding: '1.25rem 1.5rem'}}>
                                    {m.message}
                                </td>
                                <td style={{paddingRight: '2rem'}}>
                                    <span style={{fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px'}}>
                                        {m.category || 'General'}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" style={{textAlign: 'center', padding: '4rem', color: '#94a3b8'}}>
                                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>📭</div>
                                No messages found. Add your first template on the left.
                            </td></tr>
                        )}
                    </tbody>
                </table>
              </div>
          </div>

      </div>
    </div>
  );
};

export default TreeMessages;
