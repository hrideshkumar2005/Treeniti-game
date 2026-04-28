import React, { useState, useEffect } from 'react';

const Articles = ({ token }) => {
  const [articles, setArticles] = useState([]);
  const [newArt, setNewArt] = useState({ title: '', content: '', readingRewardCoins: 10, requiredReadingTimeSec: 60 });
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api';

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch(`${API_BASE}/articles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setArticles(data.articles);
    } catch(e) {
      console.error("Fetch articles error:", e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newArt)
      });
      const data = await res.json();
      if(data.success) {
        setNewArt({ title: '', content: '', readingRewardCoins: 10, requiredReadingTimeSec: 60 });
        alert("Article Published Successfully!");
        fetchArticles();
      } else {
        alert(data.error || "Failed to publish");
      }
    } catch(e) {
      alert("Network Error");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        fetchArticles();
      }
    } catch(e) {
      alert("Delete failed");
    }
  };

  return (
    <div style={{animation: 'fadeIn 0.5s ease'}}>
      <div className="page-header">
        <h1 className="page-title">Content & Articles</h1>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2.5rem', alignItems: 'start'}}>
        
        {/* Articles Table */}
        <div className="data-card">
          <div style={{padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc'}}>
              <h3 style={{fontSize: '1.1rem', color: '#334155'}}>Live Articles</h3>
          </div>
          <div style={{maxHeight: '650px', overflowY: 'auto'}}>
            <table>
                <thead>
                <tr>
                    <th style={{paddingLeft: '2rem'}}>ARTICLE DETAILS</th>
                    <th>REWARD</th>
                    <th>READ TIME</th>
                    <th style={{paddingRight: '2rem'}}>ACTIONS</th>
                </tr>
                </thead>
                <tbody>
                {articles.length > 0 ? articles.map(a => (
                    <tr key={a._id}>
                    <td style={{paddingLeft: '2rem', paddingRight: '1rem'}}>
                        <div style={{fontWeight: 700, color: '#1e293b', marginBottom: '4px'}}>{a.title}</div>
                        <div style={{fontSize: '0.8rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                            {a.content}
                        </div>
                    </td>
                    <td>
                        <span className="badge badge-success" style={{background: '#dcfce7', color: '#166534'}}>
                            {a.readingRewardCoins} Coins
                        </span>
                    </td>
                    <td>
                        <span style={{fontWeight: 600, color: '#475569'}}>{a.requiredReadingTimeSec}s</span>
                    </td>
                    <td style={{paddingRight: '2rem', textAlign: 'right'}}>
                        <button className="btn btn-outline" style={{borderColor: '#fee2e2', color: '#ef4444'}} onClick={() => handleDelete(a._id)}>
                            🗑️ Delete
                        </button>
                    </td>
                    </tr>
                )) : (
                    <tr><td colSpan="4" style={{textAlign: 'center', padding: '4rem', color: '#94a3b8'}}>No articles yet. Publish one on the right!</td></tr>
                )}
                </tbody>
            </table>
          </div>
        </div>

        {/* Publish Form */}
        <div className="data-card" style={{padding: '2.5rem', border: '1px solid #e2e8f0'}}>
          <h3 style={{marginBottom: '1.5rem', fontSize: '1.25rem', color: '#1e293b'}}>📰 Publish New Article</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
                <label>Article Title</label>
                <input 
                    className="form-control"
                    value={newArt.title}
                    onChange={e => setNewArt({...newArt, title: e.target.value})}
                    placeholder="Enter catching title..."
                    required
                />
            </div>
            <div className="form-group">
                <label>Content (Full Text)</label>
                <textarea 
                    className="form-control"
                    rows="8"
                    value={newArt.content}
                    onChange={e => setNewArt({...newArt, content: e.target.value})}
                    placeholder="Write or paste your article content here..."
                    required
                />
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <div className="form-group" style={{flex: 1}}>
                    <label>Reward Coins</label>
                    <input 
                        type="number"
                        className="form-control"
                        value={newArt.readingRewardCoins}
                        onChange={e => setNewArt({...newArt, readingRewardCoins: parseInt(e.target.value)})}
                    />
                </div>
                <div className="form-group" style={{flex: 1}}>
                    <label>Read Time (Sec)</label>
                    <input 
                        type="number"
                        className="form-control"
                        value={newArt.requiredReadingTimeSec}
                        onChange={e => setNewArt({...newArt, requiredReadingTimeSec: parseInt(e.target.value)})}
                    />
                </div>
            </div>
            <button className="btn btn-primary" style={{width: '100%', padding: '1rem', marginTop: '1rem'}} disabled={loading}>
                {loading ? 'Publishing...' : '🚀 Publish Article'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Articles;
