import React, { useState, useEffect } from 'react';

const AdminManager = ({ token }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.243.180.46:5000/api'}/admin/admins`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setAdmins(data.admins);
    } catch(e) {}
    setLoading(false);
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.243.180.46:5000/api'}/admin/roles/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, role: newRole })
      });
      const data = await res.json();
      if(data.success) {
        alert("Role updated successfully");
        fetchAdmins();
      }
    } catch(e) {}
  };

  if(loading) return <div style={{padding: '2rem'}}>Loading admin accounts...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Account Management (Super Admin)</h1>
      </div>

      <div className="data-card">
          <div style={{padding: '1.5rem', background: '#fffbeb', borderBottom: '1px solid #fef3c7', fontSize: '0.875rem', color: '#92400e'}}>
              ⚠ WARNING: You are managing accounts with elevated privileges. Changes here affect system security access.
          </div>
          <table>
              <thead>
                  <tr>
                      <th>NAME</th>
                      <th>MOBILE</th>
                      <th>CURRENT ROLE</th>
                      <th>LAST LOGIN</th>
                      <th>ACTIONS</th>
                  </tr>
              </thead>
              <tbody>
                  {admins.map(adm => (
                      <tr key={adm._id}>
                          <td style={{fontWeight: 600}}>{adm.name}</td>
                          <td>{adm.mobile}</td>
                          <td>
                              <span className={`badge ${adm.role === 'SuperAdmin' ? 'badge-super' : 'badge-admin'}`}>
                                  {adm.role}
                              </span>
                          </td>
                          <td>{adm.lastLoginDate ? new Date(adm.lastLoginDate).toLocaleString() : 'Never'}</td>
                          <td>
                              {adm.role !== 'SuperAdmin' && (
                                  <div style={{display: 'flex', gap: '10px'}}>
                                      <button className="btn btn-outline" onClick={() => handleChangeRole(adm._id, 'User')} style={{fontSize: '0.75rem'}}>Revoke Access</button>
                                  </div>
                              )}
                              {adm.role === 'SuperAdmin' && <span style={{fontSize: '0.75rem', color: '#999'}}>Protected account</span>}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      <div className="data-card" style={{marginTop: '2rem', padding: '1.5rem'}}>
          <h3>Add New Admin</h3>
          <p style={{fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem'}}>
              To promote a user to Admin, find them in the <span style={{color: '#1b5e20', fontWeight: 'bold'}}>User Management</span> tab and use the "Change Role" feature.
          </p>
      </div>
    </div>
  );
};

export default AdminManager;
