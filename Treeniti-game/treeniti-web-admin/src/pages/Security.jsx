import React, { useState, useEffect } from 'react';

const Security = ({ token }) => {
  const [logs, setLogs] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logRes, flagRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://10.243.180.46:5000/api'}/admin/security/logs`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://10.243.180.46:5000/api'}/admin/security/flagged`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const logData = await logRes.json();
      const flagData = await flagRes.json();
      if(logData.success) setLogs(logData.logs);
      if(flagData.success) setFlagged(flagData.flaggedUsers);
    } catch(e) {}
    setLoading(false);
  };

  const handleReview = async (uid, action) => {
    const notes = prompt("Enter review notes:");
    if(!notes) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.243.180.46:5000/api'}/admin/security/review-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: uid, action, adminNotes: notes })
      });
      if(res.ok) fetchData();
    } catch(e) {}
  };

  const resolveLog = async (logId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://10.243.180.46:5000/api'}/admin/security/resolve-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ logId })
      });
      fetchData();
    } catch(e) {}
  };

  if(loading) return <div style={{padding: '2rem'}}>Loading Security Audit...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Security & Anti-Bot Guard</h1>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
        
        {/* Flagged Users Section */}
        <div className="data-card">
          <h3 style={{padding: '1.5rem', borderBottom: '1px solid #e2e8f0'}}>🚩 Flagged Accounts</h3>
          <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            {flagged.length === 0 ? <p style={{padding: '1.5rem', color: '#64748b'}}>No accounts currently flagged.</p> : (
              <table>
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>VIOLATION</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {flagged.map(u => (
                    <tr key={u._id}>
                      <td>{u.name} <br/><small>{u.mobile}</small></td>
                      <td>
                        {u.securityFlags?.at(-1)?.flagType || 'Unknown'}
                      </td>
                      <td>
                        <button className="btn btn-primary" style={{padding: '0.25rem 0.5rem', fontSize: '0.7rem', marginRight: '5px'}} onClick={() => handleReview(u._id, 'block')}>Block</button>
                        <button className="btn btn-outline" style={{padding: '0.25rem 0.5rem', fontSize: '0.7rem'}} onClick={() => handleReview(u._id, 'unflag')}>Clear</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Security Logs Section */}
        <div className="data-card">
           <h3 style={{padding: '1.5rem', borderBottom: '1px solid #e2e8f0'}}>📜 Security Audit Log</h3>
           <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            <table>
                <thead>
                  <tr>
                    <th>EVENT</th>
                    <th>DETAILS</th>
                    <th>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id}>
                      <td>
                        <span className={`badge ${log.severity === 'HIGH' ? 'badge-failed' : 'badge-warning'}`}>{log.eventType}</span>
                      </td>
                      <td><small>{log.details}</small></td>
                      <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Security;
