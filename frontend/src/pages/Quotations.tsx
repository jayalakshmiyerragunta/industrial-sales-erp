import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Enquiry, Quotation } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { QuotationsIcon, PlusIcon } from '../components/icons';

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
    if (status === 'REJECTED' && q.status === 'SENT') {
      if (!window.confirm(`Reject ${q.quotationNo}? This marks the enquiry as LOST and cannot be undone.`)) return;
    }
    try {
      await api.patch(`/quotations/${q.id}/status`, { status });
      setFlash(
        status === 'REJECTED'
          ? `${q.quotationNo} rejected — enquiry marked LOST.`
          : status === 'ACCEPTED'
            ? `${q.quotationNo} accepted — enquiry marked WON.`
            : `${q.quotationNo} sent for customer review.`
      );
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
      <PageHeader
        icon={<QuotationsIcon />}
        eyebrow="Pricing"
        title="Quotations"
        description="Discount + GST totals are always computed on the backend"
      >
        <button className="primary" onClick={openNew}>
          <PlusIcon size={15} /> New quotation
        </button>
      </PageHeader>

      {flash && <div className="notice mb">{flash}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quotation No</th>
              <th>Enquiry</th>
              <th>Customer</th>
              <th className="money">Total</th>
              <th>Status</th>
              <th>Valid Until</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id}>
                <td className="doc-no">{q.quotationNo}</td>
                <td className="doc-no">{q.enquiry?.enquiryNo}</td>
                <td style={{ fontWeight: 600 }}>{q.customer?.companyName}</td>
                <td className="money">₹{money(q.totalAmount)}</td>
                <td><StatusBadge status={q.status} /></td>
                <td className="muted">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <div className="btn-row">
                    {q.status === 'DRAFT' && (
                      <button onClick={() => updateStatus(q, 'SENT')}>Send</button>
                    )}
                    {q.status === 'SENT' && (
                      <>
                        <button className="success" onClick={() => updateStatus(q, 'ACCEPTED')}>Accept</button>
                        <button className="danger" onClick={() => updateStatus(q, 'REJECTED')}>Reject</button>
                      </>
                    )}
                    {q.status === 'ACCEPTED' && !q.salesOrder && (
                      <button className="primary" onClick={() => convert(q)}>Convert to order</button>
                    )}
                    {q.status === 'ACCEPTED' && q.salesOrder && (
                      <span className="doc-no muted">{q.salesOrder.orderNo}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotations.length === 0 && (
          <EmptyState icon={<QuotationsIcon />} title="No quotations yet" hint="Quote an enquiry to start pricing." />
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New quotation</h2>
              <div className="sub">Line amounts and the grand total are recalculated server-side.</div>
            </div>
            <form className="form" onSubmit={submit}>
              <div className="modal-body">
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
                            <td><span className="doc-no">{l.productCode}</span> — <span className="muted">{l.productName}</span></td>
                            <td><input type="number" min="1" value={l.quantity} onChange={(e) => setLine(idx, 'quantity', e.target.value)} style={{ width: 70 }} /></td>
                            <td><input type="number" min="0" value={l.unitPrice} onChange={(e) => setLine(idx, 'unitPrice', e.target.value)} style={{ width: 100 }} /></td>
                            <td><input type="number" min="0" max="100" value={l.discountPct} onChange={(e) => setLine(idx, 'discountPct', e.target.value)} style={{ width: 70 }} /></td>
                            <td><input type="number" min="0" max="100" value={l.gstPct} onChange={(e) => setLine(idx, 'gstPct', e.target.value)} style={{ width: 70 }} /></td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={4} className="text-right" style={{ fontWeight: 700 }}>Estimated total</td>
                          <td className="money text-right" style={{ fontWeight: 700 }}>₹{money(total)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="sub" style={{ padding: '8px 14px' }}>
                      Preview only — the server recalculates discount + GST when you save.
                    </div>
                  </div>
                )}
                {error && <div className="error">{error}</div>}
              </div>
              <div className="modal-foot">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="primary" type="submit" disabled={lines.length === 0}>Create quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}