import { Shield, LayoutDashboard, FileBox, Upload, ArrowLeftRight, ShieldCheck, FileText, Users, Network, ScrollText, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar({ activePage, onNavigate }) {
  const { currentUser, logout } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const initials = currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'investigator'] },
    { id: 'evidence', label: 'Evidence', icon: FileBox, roles: ['admin', 'investigator'] },
    { id: 'upload', label: 'Upload Evidence', icon: Upload, roles: ['investigator'] },
    { id: 'transfer', label: 'Transfer Custody', icon: ArrowLeftRight, roles: ['investigator'] },
    { id: 'verify', label: 'Verify Integrity', icon: ShieldCheck, roles: ['admin', 'investigator'] },
    { id: 'reports', label: 'Reports', icon: FileText, roles: ['admin', 'investigator'] },
    { id: 'users', label: isAdmin ? 'User Management' : 'Teammates', icon: Users, roles: ['admin', 'investigator'] },
    { id: 'teams', label: 'Teams', icon: Network, roles: ['admin', 'investigator'] },
    { id: 'audit', label: 'Audit Log', icon: ScrollText, roles: ['admin'] },
  ];

  const visible = navItems.filter(n => n.roles.includes(currentUser?.role));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Shield size={18} color="#0a0d14" strokeWidth={2.5} />
        </div>
        <div className="logo-title">DECS</div>
        <div className="logo-sub">Evidence Custody System</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {visible.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon size={15} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{currentUser?.name}</div>
            <div className="user-role">{currentUser?.role}</div>
          </div>
        </div>
        <button className="nav-item" onClick={logout} style={{ color: 'var(--accent-red)', padding: '7px 0' }}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
