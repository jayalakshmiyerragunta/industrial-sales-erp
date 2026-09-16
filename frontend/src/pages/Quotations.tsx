import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Enquiry, Quotation } from '../api/types';
import StatusBadge from '../components/StatusBadge';

const money = (v: string | number) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

interface DraftItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discountPct: string;
  gstPct: string;
  defaultGst: number;
}

export default function Quotations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [enquiryId, setEnquiryId] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [lines, setLines] = useState<DraftItem[]>([]);

  const load = useCallback(async () => {
    const [q, e] = await Promise.all([api.get<Quotation[]>('/quotations'), api.get<Enquiry[]>('/enquiries')]);
    setQuotations(q);
    setEnquiries(e);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-open creation modal when arriving with ?enquiryId= (once enquiries load)
  useEffect(() => {
    const id = searchParams.get('enquiryId');
    if (id) setPendingId(id);
  }, [searchParams]);

  useEffect(() => {
    if (pendingId) {
      const enq = enquiries.find((e) => e.id === pendingId);
      if (enq) {
        openForEnquiry(enq.id);
        setPendingId(null);
        setSearchParams({});
      }
    }
  }, [pendingId, enquiries]); // eslint-disable-line react-hooks/exhaustive-deps

  function openForEnquiry(id: string) {
    const enq = enquiries.find((e) => e.id === id);
    if (!enq?.items?.length) return;
    setEnquiryId(id);
    setLines(
      enq.items.map((it) => ({
        productId: it.productId,
        productCode: it.product?.code ?? '',
        productName: it.product?.name ?? '',
        quantity: it.quantity,
        unitPrice: '1000',
        discountPct: '0',
        gstPct: '18',
        defaultGst: 18,
      }))
    );
    setShowModal(true);
    setSearchParams({});
  }

  function openNew() {
    setEnquiryId('');
    setLines([]);
    setShowModal(true);
  }

  function pickEnquiry(id: string) {
    setEnquiryId(id);
    const enq = enquiries.find((e) => e.id === id);
    if (enq?.items?.length) {
      setLines(
        enq.items.map((it) => ({
          productId: it.productId,
          productCode: it.product?.code ?? '',
          productName: it.product?.name ?? '',
          quantity: it.quantity,
          unitPrice: '1000',
          discountPct: '0',
          gstPct: '18',
          defaultGst: 18,
        }))
      );
    }
  }

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const base = l.quantity * Number(l.unitPrice || 0);
        const disc = base * (1 - (Number(l.discountPct || 0) / 100));
        return sum + disc * (1 + Number(l.gstPct || 0) / 100);
      }, 0),
    [lines]
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const created = await api.post<Quotation>('/quotations', {
        enquiryId,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
          discountPct: Number(l.discountPct),
          gstPct: Number(l.gstPct),
        })),
      });
      setFlash(`${created.quotationNo} created — totals computed on the backend.`);
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create quotation');
    }
  }

  async function updateStatus(q: Quotation, status: 'SENT' | 'ACCEPTED' | 'REJECTED') {
    try {
      await api.patch(`/quotations/${q.id}/status`, { status });
      await load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  async function convert(q: Quotation) {
    try {
      const so = await api.post<{ orderNo: string }>(`/quotations/${q.id}/convert`);
      setFlash(`Converted into ${so.orderNo}`);
      await load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'Conversion failed');
    }
  }

  const setLine = (idx: number, k: keyof DraftItem, v: string) =>
    setLines((arr) => arr.map((l, i) => (i === idx ? { ...l, [k]: v } : l)));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Quotations</h1>
          <div className="sub">Totals (discount + GST) are always computed on the backend</div>
        </div>
        <button className="primary" onClick={openNew}>+ New quotation</button>
      </div>

      {flash && <div className="notice mb">{flash}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quotation No</th>
              <th>Enquiry</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Valid Until</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id}>
                <td className="money">{q.quotationNo}</td>
                <td>{q.enquiry?.enquiryNo}</td>
                <td>{q.customer?.companyName}</td>
                <td className="money">₹{money(q.totalAmount)}</td>
                <td><StatusBadge status={q.status} /></td>
                <td>{q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  {q.status === 'DRAFT' && (
                    <button onClick={() => updateStatus(q, 'SENT')}>Send</button>
                  )}
                  {q.status === 'SENT' && (
                    <div className="btn-row">
                      <button className="success" onClick={() => updateStatus(q, 'ACCEPTED')}>Accept</button>
                      <button className="danger" onClick={() => updateStatus(q, 'REJECTED')}>Reject</button>
                    </div>
                  )}
                  {q.status === 'ACCEPTED' && !q.salesOrder && (
                    <button className="primary" onClick={() => convert(q)}>Convert to order</button>
                  )}
                  {q.status === 'ACCEPTED' && q.salesOrder && (
                    <span className="muted">{q.salesOrder.orderNo}</span>
                  )}
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">No quotations yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New quotation</h2>
            <form className="form" onSubmit={submit}>
              <label>
                Enquiry
                <select value={enquiryId} onChange={(e) => pickEnquiry(e.target.value)} required>
                  <option value="" disabled>Select enquiry…</option>
                  {enquiries
                    .filter((enq) => enq.status === 'NEW' || enq.status === 'QUOTED')
                    .map((enq) => (
                      <option key={enq.id} value={enq.id}>
                        {enq.enquiryNo} — {enq.customer?.companyName}
                      </option>
                    ))}
                </select>
              </label>

              {lines.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Disc %</th>
                        <th>GST %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, idx) => (
                        <tr key={idx}>
                          <td>{l.productCode} — {l.productName}</td>
                          <td><input type="number" min="1" value={l.quantity} onChange={(e) => setLine(idx, 'quantity', e.target.value)} style={{ width: 70 }} /></td>
                          <td><input type="number" min="0" value={l.unitPrice} onChange={(e) => setLine(idx, 'unitPrice', e.target.value)} style={{ width: 100 }} /></td>
                          <td><input type="number" min="0" max="100" value={l.discountPct} onChange={(e) => setLine(idx, 'discountPct', e.target.value)} style={{ width: 70 }} /></td>
                          <td><input type="number" min="0" max="100" value={l.gstPct} onChange={(e) => setLine(idx, 'gstPct', e.target.value)} style={{ width: 70 }} /></td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={4} className="text-right"><strong>Estimated total</strong></td>
                        <td className="money"><strong>₹{money(total)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="sub" style={{ padding: '8px 12px' }}>
                    Preview only — the server recalculates discount + GST when you save.
                  </div>
                </div>
              )}

              {error && <div className="error">{error}</div>}
              <div className="btn-row">
                <button className="primary" type="submit" disabled={lines.length === 0}>Create quotation</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}