import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/customers', label: 'Customers' },
  { to: '/products', label: 'Products' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/enquiries', label: 'Enquiries' },
  { to: '/quotations', label: 'Quotations' },
  { to: '/sales-orders', label: 'Sales Orders' },
  { to: '/dispatches', label: 'Dispatches' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span>Industrial</span> Sales ERP
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>{user?.name}</div>
          <div className="role">{user?.role === 'ADMIN' ? 'Administrator' : 'Sales User'}</div>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}