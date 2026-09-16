import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Customer } from '../api/types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
  });

  const load = useCallback(async () => {
    const data = await api.get<Customer[]>('/customers');
    setCustomers(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/customers', form);
      setShowModal(false);
      setForm({ companyName: '', contactPerson: '', email: '', phone: '', address: '', city: '', state: '', country: 'India' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create customer');
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <div className="sub">Who the company sells to — companies, cities, contacts</div>
        </div>
        <button className="primary" onClick={() => setShowModal(true)}>+ New customer</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>City</th>
              <th>State</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.companyName}</td>
                <td>{c.contactPerson}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.city}</td>
                <td>{c.state}</td>
                <td>{c.country}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">No customers yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New customer</h2>
            <form className="form" onSubmit={create}>
              <div className="form-row">
                <label>Company name<input value={form.companyName} onChange={set('companyName')} required /></label>
                <label>Contact person<input value={form.contactPerson} onChange={set('contactPerson')} required /></label>
                <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
                <label>Phone<input value={form.phone} onChange={set('phone')} required /></label>
                <label>Address<input value={form.address} onChange={set('address')} /></label>
                <label>City<input value={form.city} onChange={set('city')} /></label>
                <label>State<input value={form.state} onChange={set('state')} /></label>
                <label>Country<input value={form.country} onChange={set('country')} /></label>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="btn-row">
                <button className="primary" type="submit">Create</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}