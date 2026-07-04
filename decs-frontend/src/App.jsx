import { useState } from 'react';
import { useApp } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import EvidencePage from './pages/EvidencePage';
import UploadPage from './pages/UploadPage';
import TransferPage from './pages/TransferPage';
import VerifyPage from './pages/VerifyPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import TeamsPage from './pages/TeamsPage';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  evidence: 'Evidence Records',
  upload: 'Upload Evidence',
  transfer: 'Transfer Custody',
  verify: 'Verify Integrity',
  reports: 'Generate Reports',
  users: 'User Management',
  teams: 'Case Teams',
  audit: 'Audit Log',
};

export default function App() {
  const { currentUser } = useApp();
  const [page, setPage] = useState('dashboard');

  if (!currentUser) return <LoginPage />;

  const isAdmin = currentUser.role === 'admin';

  // Guard investigator-only and admin-only pages
  const safePage = (() => {
    if (page === 'audit' && !isAdmin) return 'dashboard';
    if (page === 'upload' && isAdmin) return 'evidence';
    if (page === 'transfer' && isAdmin) return 'evidence';
    return page;
  })();

  const getPageTitle = (p) => {
    if (p === 'users') return isAdmin ? 'User Management' : 'Teammates';
    return PAGE_TITLES[p];
  };

  const renderPage = () => {
    switch (safePage) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'evidence': return <EvidencePage onNavigate={setPage} />;
      case 'upload': return <UploadPage onNavigate={setPage} />;
      case 'transfer': return <TransferPage />;
      case 'verify': return <VerifyPage />;
      case 'reports': return <ReportsPage />;
      case 'users': return <UsersPage />;
      case 'teams': return <TeamsPage />;
      case 'audit': return <AuditPage />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={safePage} onNavigate={setPage} />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">{getPageTitle(safePage)}</div>
            <div className="topbar-sub">Digital Evidence Chain of Custody System</div>
          </div>
          <div className="topbar-right">
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-green)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
              System Online
            </span>
            <span className={`badge badge-${currentUser.role}`} style={{ fontSize: '0.65rem' }}>
              {currentUser.role}
            </span>
          </div>
        </div>
        {renderPage()}
      </main>
    </div>
  );
}
