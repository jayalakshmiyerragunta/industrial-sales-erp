import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Dispatch } from '../api/types';
import StatusBadge from '../components/StatusBadge';

export default function Dispatches() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);

  const load = useCallback(async () => {
    const data = await api.get<Dispatch[]>('/dispatches');
    setDispatches(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dispatches</h1>
          <div className="sub">Goods released against confirmed sales orders — one dispatch per order</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Dispatch No</th>
              <th>Sales Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Dispatch Date</th>
            </tr>
          </thead>
          <tbody>
            {dispatches.map((d) => (
              <tr key={d.id}>
                <td className="money">{d.dispatchNo}</td>
                <td>
                  {d.salesOrder?.orderNo}{' '}
                  <StatusBadge status={d.salesOrder?.status ?? ''} />
                </td>
                <td>{d.salesOrder?.customer?.companyName}</td>
                <td>{d.items?.map((i) => `${i.product?.code} ×${i.quantity}`).join(', ') || '—'}</td>
                <td>{d.vehicleNumber}</td>
                <td>{d.driverName}</td>
                <td>{new Date(d.dispatchDate).toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {dispatches.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">Nothing dispatched yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}