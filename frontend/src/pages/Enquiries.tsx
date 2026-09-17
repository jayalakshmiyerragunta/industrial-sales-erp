import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Customer, Enquiry, Product } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { EnquiriesIcon, PlusIcon } from '../components/icons';

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

  async function reject(enquiry: Enquiry) {
    if (!window.confirm(`Reject enquiry ${enquiry.enquiryNo}? This marks it as LOST and cannot be undone.`)) return;
    try {
      await api.patch(`/enquiries/${enquiry.id}/status`, { status: 'LOST' });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to reject enquiry');
    }
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
      <PageHeader
        icon={<EnquiriesIcon />}
        eyebrow="Pipeline"
        title="Enquiries"
        description="Customer requests — quote them, win or lose them"
      >
        <button className="primary" onClick={() => setShowModal(true)}>
          <PlusIcon size={15} /> New enquiry
        </button>
      </PageHeader>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Enquiry No</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Status</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enq) => (
              <tr key={enq.id}>
                <td className="doc-no">{enq.enquiryNo}</td>
                <td style={{ fontWeight: 600 }}>{enq.customer?.companyName}</td>
                <td className="muted">{enq.items?.map((i) => `${i.product?.code} ×${i.quantity}`).join(', ') || '—'}</td>
                <td><StatusBadge status={enq.status} /></td>
                <td className="muted">{new Date(enq.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <div className="btn-row">
                    {(enq.status === 'NEW' || enq.status === 'QUOTED') && (
                      <button className="primary" onClick={() => createQuotation(enq)}>Create quotation</button>
                    )}
                    {(enq.status === 'NEW' || enq.status === 'QUOTED') && (
                      <button className="danger" onClick={() => reject(enq)}>Reject</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {enquiries.length === 0 && (
          <EmptyState icon={<EnquiriesIcon />} title="No enquiries yet" hint="Capture the first customer request.">
            <button className="primary" onClick={() => setShowModal(true)}><PlusIcon size={15} /> New enquiry</button>
          </EmptyState>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New enquiry</h2>
              <div className="sub">Products and quantities the customer is asking for.</div>
            </div>
            <form className="form" onSubmit={submit}>
              <div className="modal-body">
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
                  Notes
                  <span className="hint">Optional — delivery expectations, context for the quote.</span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </label>
                <div>
                  <div className="sub mb">Products required</div>
                  {items.map((it, idx) => (
                    <div className="flex mb" key={idx}>
                      <select value={it.productId} onChange={(e) => setItem(idx, 'productId', e.target.value)} style={{ flex: 1 }}>
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
                        className="ghost"
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
                  {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="primary" type="submit">Create enquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}