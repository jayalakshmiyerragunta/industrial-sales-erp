import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { SalesOrder } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const money = (v: string | number) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function SalesOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [flash, setFlash] = useState('');
  const [dispatchTarget, setDispatchTarget] = useState<SalesOrder | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');

  const load = useCallback(async () => {
    const data = await api.get<SalesOrder[]>('/sales-orders');
    setOrders(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(orderId: string, action: 'confirm' | 'cancel') {
    try {
      const res = await api.post<{ status: string }>(`/sales-orders/${orderId}/${action}`);
      setFlash(`Order ${action}d — now ${res.status}`);
      await load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : `Failed to ${action}`);
    }
  }

  async function dispatch() {
    if (!dispatchTarget) return;
    try {
      const res = await api.post<{ dispatchNo: string }>(`/dispatches/${dispatchTarget.id}`, { vehicleNumber, driverName });
      setFlash(`Dispatched ${dispatchTarget.orderNo} — ${res.dispatchNo}`);
      setDispatchTarget(null);
      setVehicleNumber('');
      setDriverName('');
      await load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'Dispatch failed');
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Sales Orders</h1>
          <div className="sub">
            {user?.role === 'ADMIN'
              ? 'Admins confirm orders (reserving stock) and approve dispatches'
              : 'Sales users create the order at quotation conversion; admins confirm & dispatch'}
          </div>
        </div>
      </div>

      {flash && <div className="notice mb">{flash}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Customer</th>
              <th>Quotation</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="money">{o.orderNo}</td>
                <td>{o.customer?.companyName}</td>
                <td>{o.quotation?.quotationNo}</td>
                <td className="money">₹{money(o.totalAmount)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  {o.status === 'PENDING' && user?.role === 'ADMIN' && (
                    <button className="primary" onClick={() => act(o.id, 'confirm')}>Confirm & reserve</button>
                  )}
                  {o.status === 'CONFIRMED' && user?.role === 'ADMIN' && (
                    <button onClick={() => setDispatchTarget(o)}>Dispatch</button>
                  )}
                  {o.status === 'CONFIRMED' && <span className="muted">{o.dispatches?.[0]?.dispatchNo ?? '—'}</span>}
                  {(o.status === 'PENDING' || o.status === 'CONFIRMED') && user?.role === 'ADMIN' && (
                    <button className="danger" onClick={() => act(o.id, 'cancel')}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">No sales orders yet — accept a quotation and convert it.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dispatchTarget && (
        <div className="modal-backdrop" onClick={() => setDispatchTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Dispatch {dispatchTarget.orderNo}</h2>
            <div className="sub mb">Consumes reserved quantities from physical stock (admin action).</div>
            <form className="form" onSubmit={(e) => { e.preventDefault(); void dispatch(); }}>
              <label>
                Vehicle number
                <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="TN01AB1234" required />
              </label>
              <label>
                Driver name
                <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Ravi Kumar" required />
              </label>
              <div className="btn-row">
                <button className="primary" type="submit">Dispatch order</button>
                <button type="button" onClick={() => setDispatchTarget(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}