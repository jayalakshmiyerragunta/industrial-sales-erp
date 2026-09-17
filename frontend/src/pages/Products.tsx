import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Product } from '../api/types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { ProductsIcon, PlusIcon, SearchIcon } from '../components/icons';

const categories = ['Pumps & Motors', 'Bearings', 'Valves & Controls', 'Hydraulics', 'Power Transmission', 'Filtration'];
const money = (v: string | number) => Number(v).toLocaleString('en-IN');

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
      <PageHeader
        icon={<ProductsIcon />}
        eyebrow="Catalogue"
        title="Products"
        description="Product catalogue with live stock levels"
      >
        <div className="search-wrap">
          <SearchIcon size={15} />
          <input placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 230 }} />
        </div>
        {user?.role === 'ADMIN' && (
          <button className="primary" onClick={() => setShowModal(true)}>
            <PlusIcon size={15} /> New product
          </button>
        )}
      </PageHeader>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th className="money">Base price</th>
              <th className="money">Physical</th>
              <th className="money">Reserved</th>
              <th className="money">Available</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="doc-no">{p.code}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.category}</td>
                <td>{p.unit}</td>
                <td className="money">₹{money(p.basePrice)}</td>
                <td className="money">{p.physicalQty}</td>
                <td className="money">{p.reservedQty}</td>
                <td className="money" style={{ color: p.availableQty < 0 ? 'var(--red)' : 'var(--ink-2)' }}>{p.availableQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <EmptyState icon={<ProductsIcon />} title="No products matched" hint="Adjust the search or add a new product." />
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New product</h2>
              <div className="sub">Opening stock is set once at creation.</div>
            </div>
            <form className="form" onSubmit={create}>
              <div className="modal-body">
                <div className="form-row">
                  <label>
                    Code
                    <input value={form.code} onChange={set('code')} placeholder="IND-XX-000" required />
                  </label>
                  <label>Name<input value={form.name} onChange={set('name')} required /></label>
                  <label>
                    Category
                    <select value={form.category} onChange={set('category')}>
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label>Unit<input value={form.unit} onChange={set('unit')} placeholder="pcs" required /></label>
                  <label>
                    Base price (₹)
                    <input type="number" min="0" step="0.01" value={form.basePrice} onChange={set('basePrice')} required />
                  </label>
                  <label>
                    Opening physical qty
                    <input type="number" min="0" value={form.physicalQty} onChange={set('physicalQty')} />
                  </label>
                </div>
              </div>
              {error && <div className="error" style={{ padding: '0 22px' }}>{error}</div>}
              <div className="modal-foot">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="primary" type="submit">Create product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}