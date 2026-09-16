import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Product } from '../api/types';
import { useAuth } from '../context/AuthContext';

const categories = ['Pumps & Motors', 'Bearings', 'Valves & Controls', 'Hydraulics', 'Power Transmission', 'Filtration'];

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', name: '', category: categories[0], unit: 'pcs', basePrice: '', physicalQty: '' });

  const load = useCallback(async () => {
    const data = await api.get<Product[]>(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    setProducts(data);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/products', { ...form, basePrice: Number(form.basePrice), physicalQty: Number(form.physicalQty) || 0 });
      setShowModal(false);
      setForm({ code: '', name: '', category: categories[0], unit: 'pcs', basePrice: '', physicalQty: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create product');
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <div className="sub">Catalogue with live stock (physical / reserved / available)</div>
        </div>
        <div className="flex">
          <input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
          {user?.role === 'ADMIN' && <button className="primary" onClick={() => setShowModal(true)}>+ New product</button>}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Base Price</th>
              <th>Physical</th>
              <th>Reserved</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.unit}</td>
                <td className="money">₹{Number(p.basePrice).toLocaleString('en-IN')}</td>
                <td>{p.physicalQty}</td>
                <td>{p.reservedQty}</td>
                <td style={{ color: p.availableQty < 0 ? 'var(--red)' : 'var(--green)' }}>{p.availableQty}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">No products matched.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New product</h2>
            <form className="form" onSubmit={create}>
              <div className="form-row">
                <label>Code<input value={form.code} onChange={set('code')} placeholder="IND-XX-000" required /></label>
                <label>Name<input value={form.name} onChange={set('name')} required /></label>
                <label>Category
                  <select value={form.category} onChange={set('category')}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label>Unit<input value={form.unit} onChange={set('unit')} required /></label>
                <label>Base price (₹)<input type="number" min="0" step="0.01" value={form.basePrice} onChange={set('basePrice')} required /></label>
                <label>Opening physical qty<input type="number" min="0" value={form.physicalQty} onChange={set('physicalQty')} /></label>
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