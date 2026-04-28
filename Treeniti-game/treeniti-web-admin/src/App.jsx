import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Withdrawals from './pages/Withdrawals';
import Articles from './pages/Articles';
import Rewards from './pages/Rewards';
import PlantationProofs from './pages/PlantationProofs';
import SystemConfig from './pages/SystemConfig';
import TreeMessages from './pages/TreeMessages';
import AdminManager from './pages/AdminManager';
import Ads from './pages/Ads';
import Security from './pages/Security';

const API_URL = import.meta.env.VITE_API_URL || 'http://10.243.180.46:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState(null);
  const [adminRole, setAdminRole] = useState('');
  const [adminName, setAdminName] = useState('');
  const [validatingToken, setValidatingToken] = useState(true);

  // On mount: validate existing token before trusting it
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('adminToken');
      if (!storedToken) {
        setValidatingToken(false);
        return;
      }

      try {
        // Verify token is still valid AND user is Admin/SuperAdmin
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        const data = await res.json();

        if (data.success && (data.user.role === 'Admin' || data.user.role === 'SuperAdmin')) {
          setAdminToken(storedToken);
          setAdminRole(data.user.role);
          setAdminName(data.user.name);
          setIsLoggedIn(true);
        } else {
          // Token is for a non-admin user — clear it
          localStorage.removeItem('adminToken');
        }
      } catch (e) {
        // Backend unreachable — clear stale token
        localStorage.removeItem('adminToken');
      }
      setValidatingToken(false);
    };

    validateToken();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setAdminRole('');
    setAdminName('');
    setIsLoggedIn(false);
  };

  const handleLoginSuccess = (token, user) => {
    localStorage.setItem('adminToken', token);
    setAdminToken(token);
    setAdminRole(user.role);
    setAdminName(user.name);
    setIsLoggedIn(true);
  };

  // Show loading while validating token
  if (validatingToken) {
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0d3b0e 0%, #1b5e20 50%, #2e7d32 100%)'}}>
        <div style={{textAlign: 'center', color: 'white'}}>
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🌳</div>
          <div style={{fontSize: '1.2rem', fontWeight: 600, opacity: 0.9}}>Validating Session...</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{width: 32, height: 32, backgroundColor: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <span style={{color: '#1b5e20', fontSize: '1.2rem'}}>🌳</span>
          </div>
          <span>Treeniti Admin</span>
        </div>

        {/* Admin Info Badge */}
        <div style={{
          margin: '0 1rem 1rem', padding: '0.75rem 1rem', 
          background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem',
          borderLeft: '3px solid #4caf50'
        }}>
          <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#a5d6a7', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
            🛡️ System Administrator
          </div>
          <div style={{fontSize: '0.85rem', color: 'white', marginTop: '0.25rem', fontWeight: 500}}>
            {adminName || 'Administrator'}
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <NavItem icon="🏠" label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon="👥" label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <NavItem icon="🛡️" label="Anti-Bot Guard" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
          <NavItem icon="💰" label="Withdrawals" active={activeTab === 'withdrawals'} onClick={() => setActiveTab('withdrawals')} />
          <NavItem icon="📸" label="Tree Verifications" active={activeTab === 'proofs'} onClick={() => setActiveTab('proofs')} />
          <NavItem icon="💬" label="Tree Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
          <NavItem icon="🎁" label="Rewards Config" active={activeTab === 'rewards'} onClick={() => setActiveTab('rewards')} />
          <NavItem icon="📰" label="Articles" active={activeTab === 'articles'} onClick={() => setActiveTab('articles')} />
          <NavItem icon="📺" label="Ads Manager" active={activeTab === 'ads'} onClick={() => setActiveTab('ads')} />
          <NavItem icon="🔑" label="Manage Admins" active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} />
          <NavItem icon="⚙️" label="System Config" active={activeTab === 'config'} onClick={() => setActiveTab('config')} />
        </nav>

        <div style={{marginTop: 'auto'}}>
          <button className="nav-item btn-outline" style={{width: '100%', color: 'white', border: '1px solid rgba(255,255,255,0.3)'}} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard token={adminToken} />}
        {activeTab === 'users' && <Users token={adminToken} />}
        {activeTab === 'security' && <Security token={adminToken} />}
        {activeTab === 'withdrawals' && <Withdrawals token={adminToken} />}
        {activeTab === 'proofs' && <PlantationProofs token={adminToken} />}
        {activeTab === 'messages' && <TreeMessages token={adminToken} />}
        {activeTab === 'rewards' && <Rewards token={adminToken} />}
        {activeTab === 'articles' && <Articles token={adminToken} />}
        {activeTab === 'ads' && <Ads token={adminToken} />}
        {activeTab === 'admins' && <AdminManager token={adminToken} />}
        {activeTab === 'config' && <SystemConfig token={adminToken} />}
      </main>
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }) => (
  <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
    <span style={{fontSize: '1.25rem'}}>{icon}</span>
    <span>{label}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════
// 🔐 PREMIUM LOGIN PAGE — SRS 3.16 Admin Authentication
// ═══════════════════════════════════════════════════════════
const Login = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('123456');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Login: Pre-fill SuperAdmin credentials and submit
  const handleQuickLogin = () => {
    setMobile('9123456789');
    setOtp('123456');
    // Trigger login after state update
    setTimeout(() => {
      doLogin('9123456789', '123456');
    }, 100);
  };

  const doLogin = async (mobileNum, otpNum) => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileNum, otp: otpNum, deviceId: 'WEB_ADMIN' })
      });
      const data = await res.json();

      if (data.token && data.user) {
        // Verify role before allowing dashboard access
        if (data.user.role === 'Admin' || data.user.role === 'SuperAdmin') {
          onLogin(data.token, data.user);
        } else {
          setMsg('⛔ Access Denied: This account is not an Admin. Only Admin/SuperAdmin roles can access this panel.');
        }
      } else {
        setMsg(data.error || 'Login Failed');
      }
    } catch (err) {
      setMsg('❌ Backend connection error. Make sure the backend server is running on port 5000.');
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await doLogin(mobile, otp);
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d3b0e 0%, #1b5e20 40%, #2e7d32 70%, #43a047 100%)',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    }}>
      {/* Decorative background elements */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none'}}>
        <div style={{position: 'absolute', top: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.03)'}} />
        <div style={{position: 'absolute', bottom: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.02)'}} />
      </div>

      <div style={{
        width: 440, padding: '2.5rem', backgroundColor: 'white', borderRadius: '1.75rem',
        boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4)', position: 'relative', zIndex: 1
      }}>
        {/* Logo & Title */}
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1b5e20, #43a047)', marginBottom: '0.75rem',
            boxShadow: '0 4px 15px rgba(27, 94, 32, 0.3)'
          }}>
            <span style={{fontSize: '1.8rem'}}>🌳</span>
          </div>
          <h2 style={{fontSize: '1.5rem', fontWeight: 800, color: '#1b5e20', margin: '0 0 0.25rem'}}>Treeniti Admin Panel</h2>
          <p style={{color: '#94a3b8', fontSize: '0.8rem', margin: 0}}>Centralized Management Portal • SRS 3.16 Compliant</p>
        </div>

        {/* ⚡ Quick Login Button */}
        <button
          onClick={handleQuickLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '0.9rem', marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #1b5e20, #2e7d32)',
            color: 'white', border: 'none', borderRadius: '0.875rem', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 700,
            boxShadow: '0 4px 15px rgba(27, 94, 32, 0.25)',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
          onMouseOver={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(27, 94, 32, 0.35)'; }}
          onMouseOut={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(27, 94, 32, 0.25)'; }}
        >
          🛡️ Quick Login as Administrator
        </button>

        {/* Divider */}
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem'}}>
          <div style={{flex: 1, height: 1, background: '#e2e8f0'}} />
          <span style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'}}>or manual login</span>
          <div style={{flex: 1, height: 1, background: '#e2e8f0'}} />
        </div>
        
        <form onSubmit={handleLogin}>
          <label style={{display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.4rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Admin Mobile Number</label>
          <input 
            type="text" 
            placeholder="e.g. 9123456789" 
            value={mobile} 
            onChange={e => setMobile(e.target.value)}
            style={{
              width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem',
              border: '1.5px solid #e2e8f0', marginBottom: '0.875rem',
              fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = '#4caf50'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />

          <label style={{display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.4rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Enter OTP</label>
          <input 
            type="text" 
            placeholder="123456" 
            value={otp} 
            onChange={e => setOtp(e.target.value)}
            style={{
              width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem',
              border: '1.5px solid #e2e8f0', marginBottom: '1.25rem',
              fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = '#4caf50'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.85rem',
              background: '#334155', color: 'white', border: 'none', borderRadius: '0.75rem',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? '⏳ Authenticating...' : 'Access Dashboard'}
          </button>

          {msg && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem',
              background: msg.includes('Denied') || msg.includes('❌') ? '#fef2f2' : '#fff7ed',
              border: `1px solid ${msg.includes('Denied') || msg.includes('❌') ? '#fecaca' : '#fed7aa'}`,
              color: msg.includes('Denied') || msg.includes('❌') ? '#991b1b' : '#9a3412',
              fontSize: '0.8rem', textAlign: 'center', fontWeight: 500
            }}>
              {msg}
            </div>
          )}
        </form>

        {/* Demo Credentials Info Box */}
        <div style={{
          marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem',
          background: '#f0fdf4', border: '1px solid #bbf7d0'
        }}>
          <div style={{fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
            📋 Demo Credentials (SRS Section 5)
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.78rem', color: '#15803d'}}>
            <span style={{fontWeight: 600}}>Mobile:</span>
            <span style={{fontFamily: 'monospace', fontWeight: 700}}>9123456789</span>
            <span style={{fontWeight: 600}}>OTP:</span>
            <span style={{fontFamily: 'monospace', fontWeight: 700}}>123456</span>
            <span style={{fontWeight: 600}}>Role:</span>
            <span style={{fontWeight: 700}}>Administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
