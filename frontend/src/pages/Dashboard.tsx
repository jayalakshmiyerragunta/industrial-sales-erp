import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Enquiry, Quotation, SalesOrder, InventoryRow } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { DashboardIcon } from '../components/icons';

const money = (v: string | number) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function Dashboard() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  useEffect(() => {
    void Promise.all([
      api.get<Enquiry[]>('/enquiries'),
      api.get<Quotation[]>('/quotations'),
      api.get<SalesOrder[]>('/sales-orders'),
      api.get<InventoryRow[]>('/inventory'),
    ]).then(([e, q, o, i]) => {
      setEnquiries(e);
      setQuotations(q);
      setOrders(o);
      setInventory(i);
    });
  }, []);

  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
  const dispatched = orders.filter((o) => o.status === 'DISPATCHED').length;
  const accepted = quotations.filter((q) => q.status === 'ACCEPTED').length;
  const sent = quotations.filter((q) => q.status === 'SENT').length;
  const newEnq = enquiries.filter((e) => e.status === 'NEW').length;
  const openOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
  const pipeline = openOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const availableTotal = inventory.reduce((s, r) => s + r.availableQty, 0);
  const reservedTotal = inventory.reduce((s, r) => s + r.reservedQty, 0);

  const stages = [
    { label: 'Enquiry', count: enquiries.length },
    { label: 'Quotation', count: quotations.length },
    { label: 'Sales Order', count: orders.length },
    { label: 'Dispatch', count: dispatched },
  ];
  const lastActive = stages.reduce((acc, s, i) => (s.count > 0 ? i : acc), -1);
  const stepState = (i: number) => (i === lastActive ? 'active' : i < lastActive ? 'done' : '');

  const topStock = inventory
    .filter((r) => r.physicalQty > 0 || r.reservedQty > 0)
    .map((r) => ({ ...r, util: r.physicalQty > 0 ? Math.round((r.reservedQty / r.physicalQty) * 100) : 0 }))
    .sort((a, b) => b.util - a.util)
    .slice(0, 6);

  return (
    <div>
<PageHeader
        icon={<DashboardIcon />}
        eyebrow="Workspace"
        title="Dashboard"
        description="Live overview of the enquiry-to-dispatch pipeline"
      />

      <div className="stats mb">
        <StatCard label="Enquiries" value={enquiries.length} footnote={`${newEnq} awaiting quotation`} />
        <StatCard label="Quotations" value={quotations.length} footnote={`${accepted} accepted · ${sent} sent`} />
        <StatCard label="Sales Orders" value={orders.length} footnote={`${pending} pending · ${confirmed} confirmed`} />
        <StatCard label="Dispatched" value={dispatched} footnote="orders shipped" accent="green" />
        <StatCard label="Pipeline value" value={`₹${money(pipeline)}`} footnote="open orders" />
        <StatCard
          label="Inventory available"
          value={availableTotal.toLocaleString()}
          footnote={`${reservedTotal.toLocaleString()} reserved`}
          accent="amber"
        />
      </div>

      <div className="panel mb">
        <div className="panel-head">
          <h2>Workflow pipeline</h2>
          <span className="muted" style={{ fontSize: '0.78rem' }}>Enquiry → Quotation → Order → Dispatch</span>
        </div>
        <div className="stepper">
          {stages.map((s, i) => (
            <div key={s.label} style={{ display: 'contents' }}>
              <div className={`step ${stepState(i)}`}>
                <span className="step-num">{i + 1}</span>
                <span className="step-meta">
                  <span className="t">{s.label}</span>
                  <span className="c">{s.count} total</span>
                </span>
              </div>
              {i < stages.length - 1 && <span className="connector" />}
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h2>Stock utilisation</h2><span className="muted" style={{ fontSize: '0.78rem' }}>reserved ÷ physical</span></div>
          <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topStock.length === 0 && <div className="muted" style={{ fontSize: '0.84rem' }}>No stock movement yet.</div>}
            {topStock.map((r) => (
              <div key={r.productId}>
                <div className="util-head">
                  <span style={{ fontWeight: 600 }}>{r.productName}</span>
                  <span className="code">{r.util}%</span>
                </div>
                <div className="util-track">
                  <div className={`util-fill ${r.util >= 90 ? 'hot' : r.util >= 70 ? 'warn' : ''}`} style={{ width: `${Math.min(r.util, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Recent activity</h2></div>
          <div style={{ padding: '16px 18px 20px', display: 'grid', gap: 18 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Recent enquiries</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {enquiries.slice(0, 5).map((e) => (
                    <tr key={e.id}>
                      <td className="doc-no">{e.enquiryNo}</td>
                      <td><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                  {enquiries.length === 0 && <tr><td colSpan={2} className="muted">No enquiries yet.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Open orders</th><th className="money">Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {openOrders.slice(0, 5).map((o) => (
                    <tr key={o.id}>
                      <td className="doc-no">{o.orderNo}</td>
                      <td className="money">₹{money(o.totalAmount)}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                  {openOrders.length === 0 && <tr><td colSpan={3} className="muted">No open orders.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {lastActive >= 0 && (
        <div className="sub muted" style={{ marginTop: 16, fontSize: '0.78rem' }}>
          Pipeline covers {enquiries.length} enquiries · {quotations.length} quotations · {orders.length} orders · {dispatched} dispatches.
        </div>
      )}
    </div>
  );
}
