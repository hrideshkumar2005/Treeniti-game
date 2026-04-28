import React, { useState, useEffect } from 'react';

const Rewards = ({ token }) => {
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
      if(data.success && data.config) {
          const cfg = data.config;
          if(!cfg.socialRewards) cfg.socialRewards = { YouTube: 150, Facebook: 100, Instagram: 100, X: 50, WhatsApp: 50, Telegram: 50 };
          if(!cfg.socialLinks) cfg.socialLinks = { YouTube: '', Facebook: '', Instagram: '', X: '', WhatsApp: '', Telegram: '' };
          if(!cfg.levelUpRewards) cfg.levelUpRewards = { Sprout: 50, Plant: 75, GrowingPlant: 100, YoungTree: 150, MatureTree: 300 };
          setConfig(cfg);
      } else {
          setConfig({
            loginReward: 10,
            spinRewardMax: 50,
            conversionRate: 100,
            socialRewards: { YouTube: 150, Facebook: 100, Instagram: 100, X: 50, WhatsApp: 50, Telegram: 50 },
            socialLinks: { YouTube: '', Facebook: '', Instagram: '', X: '', WhatsApp: '', Telegram: '' },
            levelUpRewards: { Sprout: 50, Plant: 75, GrowingPlant: 100, YoungTree: 150, MatureTree: 300 }
          });
      }
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
      if(data.success) alert("Rewards & Social Links updated successfully!");
    } catch(e) { alert("Failed to update config"); }
  };

  if(loading || !config) return <div style={{padding: '2rem'}}>Loading Rewards Settings...</div>;

  return (
    <div style={{animation: 'fadeIn 0.5s ease'}}>
      <div className="page-header">
        <h1 className="page-title">Rewards & Social Connectivity</h1>
      </div>

      <form onSubmit={handleUpdate}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start'}}>
          
          {/* Left Column: Standard Rates */}
          <div className="data-card" style={{padding: '2rem'}}>
            <h3 style={{marginBottom: '1.5rem', color: '#1e293b'}}>📊 Standard Rates</h3>
            <div className="form-group">
                <label>Login Reward (Coins)</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={config.loginReward ?? 0} 
                    onChange={e => setConfig({...config, loginReward: parseInt(e.target.value) || 0})} 
                />
            </div>
            <div className="form-group">
                <label>Daily Spin Max (Coins)</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={config.spinRewardMax ?? 0} 
                    onChange={e => setConfig({...config, spinRewardMax: parseInt(e.target.value) || 0})} 
                />
            </div>
            <div className="form-group">
                <label>Conversion Rate (Coins per ₹1)</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={config.conversionRate ?? 100} 
                    onChange={e => setConfig({...config, conversionRate: parseInt(e.target.value) || 100})} 
                />
            </div>

            <h3 style={{marginTop: '2.5rem', marginBottom: '1.5rem', color: '#1e293b'}}>📈 Level-Up Bonuses</h3>
            {Object.keys(config.levelUpRewards || {}).map(lvl => (
                <div className="form-group" key={lvl} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label style={{marginBottom: 0}}>{lvl}</label>
                    <input 
                        type="number" 
                        className="form-control" 
                        style={{width: '100px'}}
                        value={config.levelUpRewards[lvl] ?? 0}
                        onChange={e => setConfig({
                            ...config,
                            levelUpRewards: { ...config.levelUpRewards, [lvl]: parseInt(e.target.value) || 0 }
                        })}
                    />
                </div>
            ))}
          </div>

          {/* Right Column: Social Tasks & Links */}
          <div className="data-card" style={{padding: '2rem'}}>
            <h3 style={{marginBottom: '1.5rem', color: '#1e293b'}}>📱 Social Media Tasks (Links & Rewards)</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {Object.keys(config.socialRewards || {}).map(key => (
                   <div key={key} style={{padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                        <div style={{display: 'flex', gap: '1.5rem', alignItems: 'flex-end'}}>
                            <div style={{flex: 1}}>
                                <label style={{fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase'}}>{key} Target URL (Link)</label>
                                <input 
                                    className="form-control" 
                                    placeholder={`e.g. https://youtube.com/c/yourchannel`}
                                    value={config.socialLinks?.[key] || ''} 
                                    onChange={e => {
                                        const newLinks = {...config.socialLinks, [key]: e.target.value};
                                        setConfig({...config, socialLinks: newLinks});
                                    }} 
                                />
                            </div>
                            <div style={{width: '150px'}}>
                                <label style={{fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase'}}>Reward</label>
                                <div style={{position: 'relative'}}>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        style={{paddingRight: '45px'}}
                                        value={config.socialRewards[key] ?? 0} 
                                        onChange={e => {
                                            const newSocials = {...config.socialRewards, [key]: parseInt(e.target.value) || 0};
                                            setConfig({...config, socialRewards: newSocials});
                                        }} 
                                    />
                                    <span style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8'}}>🪙</span>
                                </div>
                            </div>
                        </div>
                   </div>
                ))}
            </div>
            
            <div style={{marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9'}}>
                <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '1rem', fontSize: '1.1rem'}}>
                    💾 Save All Rewards & Social Links
                </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default Rewards;
