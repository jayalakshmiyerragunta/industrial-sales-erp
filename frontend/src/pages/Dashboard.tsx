import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Enquiry, Quotation, SalesOrder, InventoryRow } from '../api/types';
import StatusBadge from '../components/StatusBadge';

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
  const openOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
  const pipeline = openOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const availableTotal = inventory.reduce((s, r) => s + r.availableQty, 0);
  const reservedTotal = inventory.reduce((s, r) => s + r.reservedQty, 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Live overview of the enquiry-to-dispatch pipeline</div>
        </div>
      </div>

      <div className="grid mb">
        <div className="card">
          <div className="label">Enquiries</div>
          <div className="num">{enquiries.length}</div>
          <div className="sub">{enquiries.filter((e) => e.status === 'NEW').length} awaiting quotation</div>
        </div>
        <div className="card">
          <div className="label">Quotations</div>
          <div className="num">{quotations.length}</div>
          <div className="sub">{accepted} accepted, ready to convert</div>
        </div>
        <div className="card">
          <div className="label">Sales Orders</div>
          <div className="num">{orders.length}</div>
          <div className="sub">{pending} pending · {confirmed} confirmed</div>
        </div>
        <div className="card">
          <div className="label">Dispatched</div>
          <div className="num">{dispatched}</div>
        </div>
        <div className="card">
          <div className="label">Order Pipeline Value (₹)</div>
          <div className="num money">₹{money(pipeline)}</div>
          <div className="sub">open orders: PENDING + CONFIRMED</div>
        </div>
        <div className="card">
          <div className="label">Inventory</div>
          <div className="num">{availableTotal.toLocaleString()}</div>
          <div className="sub">{reservedTotal.toLocaleString()} units reserved</div>
        </div>
      </div>

      <div className="grid">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Recent Enquiries</th>
                <th>Status</th>
                <th>Customer</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.slice(0, 6).map((e) => (
                <tr key={e.id}>
                  <td className="money">{e.enquiryNo}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td>{e.customer?.companyName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pending Sales Orders</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter((o) => o.status !== 'DISPATCHED' && o.status !== 'CANCELLED').slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td className="money">{o.orderNo}</td>
                  <td className="money">₹{money(o.totalAmount)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}