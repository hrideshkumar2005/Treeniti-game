import React, { useState, useEffect } from 'react';

const SystemConfig = ({ token }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api'}/admin/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success && data.config) {
          setConfig(data.config);
      } else {
          setConfig({
            dailyEarningLimitCoins: 1000,
            dailyEarningLimitCash: 100,
            maxAccountsPerDevice: 2,
            globalMaintenanceMode: false,
            restrictNewLogins: false,
            appVersioning: { currentVersion: "2.5.0", forceUpdate: false },
            referralUnlockThreshold: 21,
            referralL1Commission: 5,
            referralL2Commission: 2,
            commissionEligibleSources: ['Water Game', 'Article', 'Tree Harvest', 'Shake Tree', 'Spin Wheel', '3-Hour Bonus', 'Daily Login']
          });
      }
    } catch(e) {}
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api'}/admin/config/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if(data.success) alert("System configuration updated!");
    } catch(e) { alert("Failed to update config"); }
  };

  if(loading) return <div style={{padding: '2rem'}}>Loading configurations...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System & Security Configuration</h1>
      </div>

      <form onSubmit={handleUpdate}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem'}}>
          
          <div className="data-card" style={{padding: '1.5rem'}}>
            <h3 style={{marginBottom: '1rem'}}>Earning Limits & Anti-Fraud</h3>
            <div className="form-group">
                <label>Daily Coin Earning Limit</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={config.dailyEarningLimitCoins ?? 0} 
                    onChange={e => setConfig({...config, dailyEarningLimitCoins: parseInt(e.target.value) || 0})} 
                />
            </div>
            <div className="form-group">
                <label>Daily Cash Earning Limit (₹)</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={config.dailyEarningLimitCash ?? 0} 
                    onChange={e => setConfig({...config, dailyEarningLimitCash: parseInt(e.target.value) || 0})} 
                />
            </div>
            <div className="form-group">
                <label>Max Accounts per Device</label>
                <input 
                    type="number" 
                    className="form-control" 
                    value={config.maxAccountsPerDevice ?? 0} 
                    onChange={e => setConfig({...config, maxAccountsPerDevice: parseInt(e.target.value) || 0})} 
                />
            </div>
          </div>

          <div className="data-card" style={{padding: '1.5rem'}}>
            <h3 style={{marginBottom: '1rem'}}>Global Switches (Super Admin)</h3>
            <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center'}}>
                    <input 
                        type="checkbox" 
                        checked={config.globalMaintenanceMode} 
                        onChange={e => setConfig({...config, globalMaintenanceMode: e.target.checked})} 
                        style={{marginRight: '10px'}}
                    />
                    Maintenance Mode (Offline)
                </label>
            </div>
            <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center'}}>
                    <input 
                        type="checkbox" 
                        checked={config.restrictNewLogins} 
                        onChange={e => setConfig({...config, restrictNewLogins: e.target.checked})} 
                        style={{marginRight: '10px'}}
                    />
                    Restrict New Logins
                </label>
            </div>
            <h4 style={{marginTop: '1.5rem', marginBottom: '0.5rem'}}>App Versioning</h4>
            <div className="form-group">
                <label>Current Live Version</label>
                <input 
                    type="text" 
                    className="form-control" 
                    value={config.appVersioning.currentVersion} 
                    onChange={e => setConfig({
                        ...config, 
                        appVersioning: {...config.appVersioning, currentVersion: e.target.value}
                    })} 
                />
            </div>
            <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center'}}>
                    <input 
                        type="checkbox" 
                        checked={config.appVersioning.forceUpdate} 
                        onChange={e => setConfig({
                            ...config, 
                            appVersioning: {...config.appVersioning, forceUpdate: e.target.checked}
                        })} 
                        style={{marginRight: '10px'}}
                    />
                    Force Update (Strict)
                </label>
            </div>
          </div>

        </div>

        <div className="data-card" style={{padding: '1.5rem', marginTop: '2rem'}}>
             <h3 style={{marginBottom: '1rem'}}>Referral & Commission</h3>
             <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem'}}>
                <div className="form-group">
                    <label>Unlock Threshold (Earnings ₹)</label>
                    <input 
                        type="number" 
                        className="form-control" 
                        value={config.referralUnlockThreshold ?? 0}
onChange={e => setConfig({...config, referralUnlockThreshold: parseInt(e.target.value) || 0})}
/>
</div>
<div className="form-group">
<label>L1 Commission (%)</label>
<input
type="number"
className="form-control"
value={config.referralL1Commission ?? 0}
onChange={e => setConfig({...config, referralL1Commission: parseInt(e.target.value) || 0})}
/>
</div>
<div className="form-group">
<label>L2 Commission (%)</label>
<input
type="number"
className="form-control"
value={config.referralL2Commission ?? 0}
onChange={e => setConfig({...config, referralL2Commission: parseInt(e.target.value) || 0})}
                    />
                </div>
             </div>

             <div className="form-group" style={{marginTop: '1.5rem'}}>
                <label style={{marginBottom: '0.75rem', display: 'block', fontWeight: 600}}>Commission Eligible Sources</label>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                    {['Water Game', 'Article', 'Tree Harvest', 'Shake Tree', 'Spin Wheel', '3-Hour Bonus', 'Daily Login'].map(src => (
                        <label key={src} style={{
                            padding: '8px 15px', 
                            borderRadius: '20px', 
                            border: `1px solid ${config.commissionEligibleSources.includes(src) ? '#1B5E20' : '#ddd'}`,
                            background: config.commissionEligibleSources.includes(src) ? '#E8F5E9' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <input 
                                type="checkbox" 
                                style={{display: 'none'}}
                                checked={config.commissionEligibleSources.includes(src)}
                                onChange={e => {
                                    const current = config.commissionEligibleSources;
                                    const next = e.target.checked 
                                        ? [...current, src] 
                                        : current.filter(s => s !== src);
                                    setConfig({...config, commissionEligibleSources: next});
                                }}
                            />
                            {src}
                        </label>
                    ))}
                </div>
             </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{marginTop: '2rem', padding: '0.75rem 2rem'}}>💾 Push Global Config Update</button>
      </form>
    </div>
  );
};

export default SystemConfig;
