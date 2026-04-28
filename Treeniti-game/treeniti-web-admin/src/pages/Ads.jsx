import React, { useState, useEffect } from 'react';

const Ads = ({ token }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api';

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
        const res = await fetch(`${API_BASE}/admin/config`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if(data.success) setConfig(data.config);
    } catch(e) {}
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_BASE}/admin/config/update`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if(data.success) alert("Ads & Video settings updated successfully!");
    } catch(e) { alert("Update failed"); }
  };

  if(loading || !config) return <div style={{padding: '2rem'}}>Loading settings...</div>;

  return (
    <div style={{animation: 'fadeIn 0.5s ease'}}>
      <div className="page-header">
        <h1 className="page-title">Advertising & Video Content</h1>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
        
        {/* Left: Video Settings */}
        <div className="data-card" style={{padding: '2rem'}}>
            <h3 style={{marginBottom: '1.5rem'}}>📺 Custom Reward Video</h3>
            <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem'}}>
                Users click 'Watch Video' to view this custom content instead of a generic ad.
            </p>
            
            <form onSubmit={handleUpdate}>
                <div className="form-group">
                    <label>Reward Video URL (YouTube/Direct Link)</label>
                    <input 
                        className="form-control" 
                        placeholder="e.g. https://youtube.com/watch?v=..."
                        value={config.rewardedVideoLink || ''} 
                        onChange={e => setConfig({...config, rewardedVideoLink: e.target.value})} 
                    />
                </div>
                <div className="form-group" style={{marginTop: '1.5rem'}}>
                    <label>Wait Duration (Seconds) before reward</label>
                    <input 
                        type="number"
                        className="form-control" 
                        value={config.rewardWaitTimeSec || 30} 
                        onChange={e => setConfig({...config, rewardWaitTimeSec: parseInt(e.target.value) || 30})} 
                    />
                </div>
                <div className="form-group" style={{marginTop: '1.5rem'}}>
                    <label>Reward Coins (Per View)</label>
                    <input 
                        type="number"
                        className="form-control" 
                        value={config.rewardedAdCoins || 10} 
                        onChange={e => setConfig({...config, rewardedAdCoins: parseInt(e.target.value) || 10})} 
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '2rem'}}>
                    💾 Save Video Settings
                </button>
            </form>
        </div>

        {/* Right: Ad Logic Settings */}
        <div className="data-card" style={{padding: '2rem'}}>
            <h3 style={{marginBottom: '1.5rem'}}>⚙️ Global Limits</h3>
            <div className="form-group">
                <label>Daily Ad/Video Limit (Per User)</label>
                <input 
                    type="number"
                    className="form-control" 
                    value={config.dailyAdLimit || 10} 
                    onChange={e => setConfig({...config, dailyAdLimit: parseInt(e.target.value) || 10})} 
                />
            </div>
            
            <div style={{marginTop: '2rem', padding: '1.5rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #f59e0b'}}>
                <h4 style={{color: '#92400e', marginBottom: '0.5rem'}}>💡 Tip</h4>
                <p style={{fontSize: '0.85rem', color: '#b45309'}}>
                    YouTube links will open the YouTube app on the user's phone. Use direct MP4 links if you want to play them inside the app.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Ads;
