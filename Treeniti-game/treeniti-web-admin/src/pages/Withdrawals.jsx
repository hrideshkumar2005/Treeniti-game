import React, { useState, useEffect } from 'react';

const Withdrawals = ({ token }) => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [filter, setFilter] = useState('Pending');

  useEffect(() => {
    fetchWithdrawals();
  }, [filter]);

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api'}/admin/withdrawals/history?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setWithdrawals(data.withdrawals);
    } catch(e) {}
  };

  const handleProcess = async (id, status) => {
    const txnId = status === 'Approved' ? prompt("Enter Transaction ID:") : null;
    if(status === 'Approved' && !txnId) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api'}/admin/withdrawals/process`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ withdrawalId: id, status, transactionId: txnId })
      });
      const data = await res.json();
      if(data.success) {
        alert(`Withdrawal ${status}`);
        fetchWithdrawals();
      }
    } catch(e) {}
  };

  const handleExport = () => {
    const headers = "Name,Mobile,Amount,UPI ID,Date,Status\n";
    const rows = withdrawals.map(w => `${w.userId?.name},${w.userId?.mobile},${w.amount},${w.upiId},${new Date(w.requestDate).toLocaleDateString()},${w.status}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Withdrawals_${filter}_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Payout Management</h1>
        <div style={{display: 'flex', gap: '10px'}}>
             <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
             </select>
             <button className="btn btn-outline" onClick={handleExport}>📥 Export CSV</button>
        </div>
      </div>

      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>USER</th>
              <th>AMOUNT</th>
              <th>UPI ID</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map(w => (
              <tr key={w._id}>
                <td>
                    <div style={{fontWeight: 600}}>{w.userId?.name}</div>
                    <div style={{fontSize: '0.75rem', color: '#64748b'}}>{w.userId?.mobile}</div>
                </td>
                <td style={{fontWeight: 'bold', color: '#1B5E20'}}>₹{w.amount}</td>
                <td><code style={{background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px'}}>{w.upiId}</code></td>
                <td>{new Date(w.requestDate).toLocaleString()}</td>
                <td>
                  {w.status === 'Pending' ? (
                    <div style={{display: 'flex', gap: '5px'}}>
                        <button className="btn btn-primary" onClick={() => handleProcess(w._id, 'Approved')} style={{background: '#10b981', padding: '0.25rem 0.5rem', fontSize: '0.75rem'}}>Approve</button>
                        <button className="btn btn-danger" onClick={() => handleProcess(w._id, 'Rejected')} style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}}>Reject</button>
                    </div>
                  ) : (
                    <span className={`badge badge-${w.status.toLowerCase()}`}>{w.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Withdrawals;
