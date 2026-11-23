import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PawPrint, Droplets, ClipboardList, BarChart3, Settings, LogOut, Menu, X, Milk } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/cows', label: 'Manage Cows', icon: PawPrint },
  { to: '/record-milk', label: 'Record Milk', icon: Droplets },
  { to: '/milk-records', label: 'Milk Records', icon: ClipboardList },
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { farm, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const logout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={24} /></button>
        <b>DairyFarm Manager</b>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark"><Milk size={22} /></div>
          <div>
            <div className="brand-name">DairyFarm</div>
            <div className="brand-sub">Manager</div>
          </div>
          <span className="spacer" />
          {open && <button className="icon-btn" style={{ color: '#fff' }} onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>}
        </div>
        <nav style={{ display: 'grid', gap: 4 }}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={20} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="farm-chip">
            <div className="avatar">{initials(profile?.full_name || farm?.farm_name)}</div>
            <div className="who">
              <b>{farm?.farm_name}</b>
              <span>{profile?.full_name}</span>
            </div>
          </div>
          <button className="nav-link" onClick={logout}><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="main">
        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}
