import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, getDrivers, type Driver } from '../api/client';
import type { SalesOrder } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SalesOrdersIcon, TruckIcon } from '../components/icons';
import { useAuth } from '../context/AuthContext';

const money = (v: string | number) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function SalesOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [flash, setFlash] = useState('');
  const [dispatchTarget, setDispatchTarget] = useState<SalesOrder | null>(null);
  const [driverId, setDriverId] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get<SalesOrder[]>('/sales-orders');
      setOrders(data);
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'Failed to load orders');
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    try {
      setDrivers(await getDrivers());
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'Failed to load drivers');
    }
  }, []);

  useEffect(() => {
    void load();
    void loadDrivers();
  }, [load, loadDrivers]);

  async function act(orderId: string, action: 'confirm' | 'cancel') {
    try {
      const res = await api.post<{ status: string }>(`/sales-orders/${orderId}/${action}`);
      setFlash(`Order ${action}d — now ${res.status}`);
      await load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : `Failed to ${action}`);
    }
  }

  function openDispatch(order: SalesOrder) {
    setDispatchTarget(order);
    setDriverId('');
    void loadDrivers();
  }

  async function dispatch() {
    if (!dispatchTarget || !driverId) return;
    try {
      const res = await api.post<{ dispatchNo: string }>(`/dispatches/${dispatchTarget.id}`, { driverId });
      setFlash(`Dispatched ${dispatchTarget.orderNo} — ${res.dispatchNo}`);
      setDispatchTarget(null);
      setDriverId('');
      await load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'Dispatch failed');
    }
  }

  const freeCount = drivers.filter((d) => !d.allocated).length;
  const chosen = drivers.find((d) => d.id === driverId);

  return (
    <div>
      <PageHeader
        icon={<SalesOrdersIcon />}
        eyebrow="Orders"
        title="Sales Orders"
        description={
          user?.role === 'ADMIN'
            ? 'Admins confirm orders — reserving stock — and approve dispatches'
            : 'Sales create orders at quotation conversion; admins confirm & dispatch'
        }
      />

      {flash && <div className="notice mb">{flash}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Customer</th>
              <th>Quotation</th>
              <th className="money">Total</th>
              <th>Status</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="doc-no">{o.orderNo}</td>
                <td style={{ fontWeight: 600 }}>{o.customer?.companyName}</td>
                <td className="doc-no">{o.quotation?.quotationNo}</td>
                <td className="money">₹{money(o.totalAmount)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="muted">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <div className="btn-row">
                    {o.status === 'PENDING' && user?.role === 'ADMIN' && (
                      <button className="primary" onClick={() => act(o.id, 'confirm')}>Confirm &amp; reserve</button>
                    )}
                    {o.status === 'CONFIRMED' && user?.role === 'ADMIN' && (
                      <button onClick={() => openDispatch(o)}><TruckIcon size={15} /> Dispatch</button>
                    )}
                    {o.status === 'CONFIRMED' && <span className="doc-no muted">{o.dispatches?.[0]?.dispatchNo ?? '—'}</span>}
                    {(o.status === 'PENDING' || o.status === 'CONFIRMED') && user?.role === 'ADMIN' && (
                      <button className="danger" onClick={() => act(o.id, 'cancel')}>Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <EmptyState icon={<SalesOrdersIcon />} title="No sales orders yet" hint="Accept a quotation and convert it." />
        )}
      </div>

      {dispatchTarget && (
        <div className="modal-backdrop" onClick={() => setDispatchTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dispatch {dispatchTarget.orderNo}</h2>
              <div className="sub">Consumes reserved stock; the driver is reserved for this order only.</div>
            </div>
            <form className="form" onSubmit={(e) => { e.preventDefault(); void dispatch(); }}>
              <div className="modal-body">
                <label>
                  Driver / vehicle
                  <select value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
                    <option value="">Choose a driver…</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.allocated}>
                        {d.name} — {d.vehicleNumber}{d.allocated ? ' (allocated)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {chosen && (
                  <div className="flex" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: '8px', padding: '8px 12px' }}>
                    <span className="avatar" style={{ width: 26, height: 26, fontSize: '0.7rem' }}>
                      {chosen.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </span>
                    <span style={{ fontWeight: 600 }}>{chosen.name}</span>
                    <span className="doc-no muted">{chosen.vehicleNumber}</span>
                  </div>
                )}
                <div className="sub">
                  {freeCount > 0
                    ? `${freeCount} of ${drivers.length} drivers available`
                    : 'No drivers available — all are allocated to other orders'}
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" onClick={() => setDispatchTarget(null)}>Cancel</button>
                <button className="primary" type="submit" disabled={!driverId}>Dispatch order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}