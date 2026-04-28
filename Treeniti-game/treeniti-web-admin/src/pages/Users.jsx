import React, { useState, useEffect } from 'react';

const Users = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setUsers(data.users);
    } catch(e) {}
  };

  const handleBlock = async (uid, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: uid, isBlocked: !currentStatus })
      });
      if(res.ok) fetchUsers();
    } catch(e) {}
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            userId: editUser._id,
            name: editUser.name,
            walletCoins: Number(editUser.walletCoins),
            walletCash: Number(editUser.walletCash),
            isFlagged: editUser.isFlagged
        })
      });
      if(res.ok) {
          setEditUser(null);
          fetchUsers();
          alert("User updated successfully!");
      }
    } catch(e) {
        alert("Execution failed.");
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.mobile?.includes(search)
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <input 
          type="text" 
          placeholder="Search by name or mobile..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="data-card">
        <table>
          <thead>
            <tr>
              <th>USER DETAILS</th>
              <th>WALLET (COINS / ₹)</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u._id}>
                <td>
                   <div style={{fontWeight: 600}}>{u.name} {u.isFlagged && '🚩'}</div>
                   <div style={{fontSize: '0.75rem', color: '#64748b'}}>{u.mobile}</div>
                </td>
                <td>
                   <div>{u.walletCoins} Coins</div>
                   <div style={{color: '#22c55e', fontWeight: 600}}>₹{u.walletCash}</div>
                </td>
                <td>{u.role}</td>
                <td>
                   <span className={`badge ${u.isBlocked ? 'badge-failed' : 'badge-success'}`}>
                    {u.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td style={{display: 'flex', gap: '0.5rem'}}>
                  <button className="btn btn-outline" onClick={() => setEditUser(u)}>Edit</button>
                  <button 
                    className={`btn ${u.isBlocked ? 'btn-primary' : 'btn-outline'}`} 
                    onClick={() => handleBlock(u._id, u.isBlocked)}
                  >
                    {u.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editUser && (
          <div className="modal-overlay">
              <div className="modal-content" style={{maxWidth: 400}}>
                  <h3>Edit User: {editUser.mobile}</h3>
                  <form onSubmit={handleUpdate}>
                      <div className="form-group">
                          <label>Full Name</label>
                          <input type="text" className="form-control" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Wallet Coins</label>
                          <input type="number" className="form-control" value={editUser.walletCoins} onChange={e => setEditUser({...editUser, walletCoins: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <label>Wallet Cash (₹)</label>
                          <input type="number" className="form-control" value={editUser.walletCash} onChange={e => setEditUser({...editUser, walletCash: e.target.value})} />
                      </div>
                      <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: '1rem'}}>
                          <input type="checkbox" id="flagUser" checked={editUser.isFlagged} onChange={e => setEditUser({...editUser, isFlagged: e.target.checked})} />
                          <label htmlFor="flagUser" style={{marginBottom: 0}}>Flag for Suspicious Activity</label>
                      </div>
                      <div style={{display: 'flex', gap: 12, marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20}}>
                          <button type="submit" className="btn btn-primary" style={{flex: 1}} disabled={loading}>{loading ? 'Saving...' : 'Update User'}</button>
                          <button type="button" className="btn btn-outline" style={{flex: 1}} onClick={() => setEditUser(null)}>Cancel</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Users;
