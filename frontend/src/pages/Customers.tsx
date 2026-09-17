import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Customer } from '../api/types';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { CustomersIcon, PlusIcon } from '../components/icons';

const emptyForm = { companyName: '', contactPerson: '', mobile: '', email: '', city: '' };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

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
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create customer');
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        icon={<CustomersIcon />}
        eyebrow="Accounts"
        title="Customers"
        description="Who the company sells to — companies, cities and contacts"
      >
        <button className="primary" onClick={() => setShowModal(true)}>
          <PlusIcon size={15} /> New customer
        </button>
      </PageHeader>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.companyName}</td>
                <td>{c.contactPerson}</td>
                <td className="money">{c.mobile}</td>
                <td>{c.email || '—'}</td>
                <td>{c.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <EmptyState icon={<CustomersIcon />} title="No customers yet" hint="Add your first account to start an enquiry.">
            <button className="primary" onClick={() => setShowModal(true)}><PlusIcon size={15} /> New customer</button>
          </EmptyState>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New customer</h2>
              <div className="sub">Company and primary contact details.</div>
            </div>
            <form className="form" onSubmit={create}>
              <div className="modal-body">
                <div className="form-row">
                  <label>Company name<input value={form.companyName} onChange={set('companyName')} required /></label>
                  <label>Contact person<input value={form.contactPerson} onChange={set('contactPerson')} required /></label>
                  <label>Mobile<input value={form.mobile} onChange={set('mobile')} minLength={10} required /></label>
                  <label>Email<input type="email" value={form.email} onChange={set('email')} /></label>
                  <label>City<input value={form.city} onChange={set('city')} required /></label>
                </div>
              </div>
              {error && <div className="error" style={{ padding: '0 22px' }}>{error}</div>}
              <div className="modal-foot">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="primary" type="submit">Create customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}