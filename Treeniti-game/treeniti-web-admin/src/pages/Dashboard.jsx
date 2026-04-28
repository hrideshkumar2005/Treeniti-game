import React, { useState, useEffect } from 'react';

const Dashboard = ({ token }) => {
  const [stats, setStats] = useState({ users: 0, trees: 0, w_pending: 0, p_pending: 0, flagged: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [latestProofs, setLatestProofs] = useState([]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api';

  useEffect(() => {
    fetchData();
    fetchAnalytics();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) {
        setStats(data.stats);
        setLatestProofs(data.latestProofs || []);
      }
    } catch(e) {}
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setAnalytics(data.analytics);
    } catch(e) {}
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <button className="btn btn-primary" onClick={fetchData}>🔄 Sync Live Data</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Users" val={stats.users} ic="👥" />
        <StatCard label="Trees Planted" val={stats.trees} ic="🌳" />
        <StatCard label="Pending Payouts" val={stats.w_pending} ic="💰" />
        <StatCard label="Verifications" val={stats.p_pending} ic="📸" />
      </div>

      {analytics && (
        <div style={{marginTop: '2rem', marginBottom: '2.5rem'}}>
            <h2 style={{fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem'}}>Platform Analytics (Super Admin Only)</h2>
            <div className="stats-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
                <div className="stat-card" style={{borderColor: '#fef3c7', background: '#fffbeb'}}>
                    <span className="stat-label">Total Revenue Burn (Paid)</span>
                    <div className="stat-val" style={{color: '#92400e'}}>₹{analytics.revenueBurn.toLocaleString()}</div>
                </div>
                <div className="stat-card" style={{borderColor: '#dcfce7', background: '#f0fdf4'}}>
                    <span className="stat-label">Coins in Circulation</span>
                    <div className="stat-val" style={{color: '#166534'}}>{analytics.totalCoinsInCirculation.toLocaleString()} C</div>
                </div>
                <div className="stat-card" style={{borderColor: '#e0f2fe', background: '#f0f9ff'}}>
                    <span className="stat-label">Growth (New Users 7d)</span>
                    <div className="stat-val" style={{color: '#075985'}}>+{analytics.newUsers7d}</div>
                </div>
            </div>
        </div>
      )}

      <h2 style={{fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem'}}>Recent Tree Uploads</h2>
      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>USER</th>
              <th>TREE</th>
              <th>SUBMITTED</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {(latestProofs && latestProofs.length > 0) ? latestProofs.map(p => (
              <tr key={p._id}>
                <td>
                   <div style={{fontWeight: 600}}>{p.userId?.name}</div>
                   <div style={{fontSize: '0.75rem', color: '#64748b'}}>{p.userId?.mobile}</div>
                </td>
                <td>{p.treeId?.treeName} (Day {p.day})</td>
                <td>{new Date(p.submittedAt).toLocaleDateString()}</td>
                <td><span className="badge badge-pending">{p.status}</span></td>
                <td>
                  <button className="btn btn-outline" style={{padding: '0.25rem 0.75rem'}}>Review</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No recent uploads found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatCard = ({ label, val, ic }) => (
  <div className="stat-card">
    <div style={{display: 'flex', justifyContent: 'space-between'}}>
      <span className="stat-label">{label}</span>
      <span style={{fontSize: '1.25rem'}}>{ic}</span>
    </div>
    <div className="stat-val">{val}</div>
  </div>
);

export default Dashboard;
