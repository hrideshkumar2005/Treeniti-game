import React, { useState, useEffect } from 'react';

const PlantationProofs = ({ token }) => {
  const [proofs, setProofs] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);

  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api'}/admin/proofs/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(data.success) setProofs(data.proofs);
    } catch(e) {}
  };

  const handleVerify = async (status) => {
    const notes = prompt(`Enter optional notes for ${status}:`);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://10.187.65.46:5000/api'}/admin/proofs/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ proofId: selectedProof._id, status, adminNotes: notes })
      });
      const data = await res.json();
      if(data.success) {
        alert("Verification successfull");
        setSelectedProof(null);
        fetchProofs();
      }
    } catch(e) {}
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Real Plantation Verification</h1>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(1, 1fr)'}}>
          <div className="data-card">
            <table>
                <thead>
                    <tr>
                        <th>USER</th>
                        <th>TREE</th>
                        <th>STAGE</th>
                        <th>SUBMITTED</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {proofs.map(p => (
                        <tr key={p._id}>
                            <td>{p.userId?.name} ({p.userId?.mobile})</td>
                            <td>{p.treeId?.treeName}</td>
                            <td><span className="badge badge-info">Day {p.day}</span></td>
                            <td>{new Date(p.submittedAt).toLocaleDateString()}</td>
                            <td>
                                <button className="btn btn-primary" onClick={() => setSelectedProof(p)}>Review Photos</button>
                            </td>
                        </tr>
                    ))}
                    {proofs.length === 0 && <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No pending proofs.</td></tr>}
                </tbody>
            </table>
          </div>
      </div>

      {selectedProof && (
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'}}>
              <div className="data-card" style={{width: '90%', maxHeight: '90%', overflowY: 'auto', padding: '2rem', background: '#fff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem'}}>
                      <h2>Review Proof: {selectedProof.userId?.name}</h2>
                      <button className="btn btn-outline" onClick={() => setSelectedProof(null)}>Close</button>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem'}}>
                      {selectedProof.images.map((img, i) => (
                          <img key={i} src={img} alt="Proof" style={{width: '100%', borderRadius: '12px', border: '1px solid #ddd'}} />
                      ))}
                  </div>

                  <div style={{marginTop: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
                      <p><strong>User Notes:</strong> {selectedProof.notes || "None"}</p>
                  </div>

                  <div style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                      <button className="btn btn-primary" onClick={() => handleVerify('Verified')} style={{background: '#10b981', padding: '1rem 3rem'}}>Approve & Reward</button>
                      <button className="btn btn-danger" onClick={() => handleVerify('Rejected')} style={{padding: '1rem 3rem'}}>Reject Proof</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PlantationProofs;
