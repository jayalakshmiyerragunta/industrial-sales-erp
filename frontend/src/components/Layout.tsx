import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Logo, DashboardIcon, CustomersIcon, ProductsIcon, InventoryIcon,
  EnquiriesIcon, QuotationsIcon, SalesOrdersIcon, DispatchesIcon, SignOutIcon,
} from './icons';

const links = [
  { to: '/', label: 'Dashboard', end: true, icon: DashboardIcon },
  { to: '/customers', label: 'Customers', icon: CustomersIcon },
  { to: '/products', label: 'Products', icon: ProductsIcon },
  { to: '/inventory', label: 'Inventory', icon: InventoryIcon },
  { to: '/enquiries', label: 'Enquiries', icon: EnquiriesIcon },
  { to: '/quotations', label: 'Quotations', icon: QuotationsIcon },
  { to: '/sales-orders', label: 'Sales Orders', icon: SalesOrdersIcon },
  { to: '/dispatches', label: 'Dispatches', icon: DispatchesIcon },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const initials = (user?.name ?? '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand-wrap">
          <Logo className="logo" />
        </div>
        <div className="nav-section">Workspace</div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <l.icon />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'ADMIN' ? 'Administrator' : 'Sales User'}</div>
            </div>
          </div>
          <button onClick={logout}>
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}