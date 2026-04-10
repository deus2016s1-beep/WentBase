import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

const navItemStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? '#0b5fff' : '#333',
  textDecoration: 'none',
  fontWeight: isActive ? 700 : 500
});

export const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: '1px solid #ddd' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: '#111', fontSize: 20, fontWeight: 700 }}>
          WindBase
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{user?.fullName} ({user?.role})</span>
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 'calc(100vh - 65px)' }}>
        <aside style={{ borderRight: '1px solid #eee', padding: 16 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <NavLink to="/dashboard" style={navItemStyle}>Dashboard</NavLink>
            <NavLink to="/projects" style={navItemStyle}>Projects</NavLink>
            <NavLink to="/cash-journal" style={navItemStyle}>Cash Journal</NavLink>
            <NavLink to="/partners" style={navItemStyle}>Partners</NavLink>
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
