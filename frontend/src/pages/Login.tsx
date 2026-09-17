import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { FactoryIcon, AlertIcon } from '../components/icons';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@erp.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-panel">
          <div className="login-brand">
            <span className="logo-badge">
              <FactoryIcon size={22} />
            </span>
            <span className="wordmark">
              <strong>Industrial Sales ERP</strong>
              <span>Enquiry to dispatch</span>
            </span>
          </div>

          <p className="login-str">
            Sign in to manage enquiries, quotations, sales orders, inventory reservations and
            dispatches for the industrial product line.
          </p>

          {error && (
            <div className="error" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontWeight: 600 }}>
              <AlertIcon size={15} />
              {error}
            </div>
          )}

          <form className="form" onSubmit={onSubmit}>
            <label>
              Work email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="login-hint">
            <div className="row">
              <span>Admin</span>
              <code>admin@erp.com / Admin@123</code>
            </div>
            <div className="row">
              <span>Sales</span>
              <code>sales@erp.com / Sales@123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
