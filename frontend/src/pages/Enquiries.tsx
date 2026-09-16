import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Customer, Enquiry, Product } from '../api/types';
import StatusBadge from '../components/StatusBadge';

export default function Enquiries() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([{ productId: '', quantity: '1' }]);

  const load = useCallback(async () => {
    const [e, c, p] = await Promise.all([
      api.get<Enquiry[]>('/enquiries'),
      api.get<Customer[]>('/customers'),
      api.get<Product[]>('/products'),
    ]);
    setEnquiries(e);
    setCustomers(c);
    setProducts(p);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function createQuotation(enquiry: Enquiry) {
    navigate(`/quotations?enquiryId=${enquiry.id}`);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      customerId,
      notes: notes || undefined,
      items: items.filter((i) => i.productId).map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
    };
    if (payload.items.length === 0) {
      setError('Add at least one product');
      return;
    }
    try {
      await api.post('/enquiries', payload);
      setShowModal(false);
      setItems([{ productId: '', quantity: '1' }]);
      setNotes('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create enquiry');
    }
  }

  const setItem = (idx: number, k: 'productId' | 'quantity', v: string) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Enquiries</h1>
          <div className="sub">Customer product requests {'->'} quote, win or lose them</div>
        </div>
        <button className="primary" onClick={() => setShowModal(true)}>+ New enquiry</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Enquiry No</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enq) => (
              <tr key={enq.id}>
                <td className="money">{enq.enquiryNo}</td>
                <td>{enq.customer?.companyName}</td>
                <td>{enq.items?.map((i) => `${i.product?.code} ×${i.quantity}`).join(', ') || '—'}</td>
                <td>{enq.notes || '—'}</td>
                <td><StatusBadge status={enq.status} /></td>
                <td>{new Date(enq.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  {(enq.status === 'NEW' || enq.status === 'QUOTED') && (
                    <button className="primary" onClick={() => createQuotation(enq)}>Create quotation</button>
                  )}
                </td>
              </tr>
            ))}
            {enquiries.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">No enquiries yet — create your first one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New enquiry</h2>
            <form className="form" onSubmit={submit}>
              <label>
                Customer
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="" disabled>Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName} — {c.city}</option>
                  ))}
                </select>
              </label>
              <label>
                Notes <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </label>
              <div>
                <div className="sub mb">Products required</div>
                {items.map((it, idx) => (
                  <div className="flex mb" key={idx}>
                    <select value={it.productId} onChange={(e) => setItem(idx, 'productId', e.target.value)}>
                      <option value="" disabled>Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                      style={{ width: 90 }}
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      onClick={() => setItems((a) => a.filter((_, i) => i !== idx))}
                      disabled={items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setItems((a) => [...a, { productId: '', quantity: '1' }])}>
                  + Add product
                </button>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="btn-row">
                <button className="primary" type="submit">Create enquiry</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}