import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Dispatch } from '../api/types';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { DispatchesIcon } from '../components/icons';

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
      <PageHeader
        icon={<DispatchesIcon />}
        eyebrow="Logistics"
        title="Dispatches"
        description="Goods released against confirmed orders — one dispatch per order"
      />

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
                <td className="doc-no">{d.dispatchNo}</td>
                <td>
                  <span className="doc-no">{d.salesOrder?.orderNo}</span>{' '}
                  <StatusBadge status={d.salesOrder?.status ?? ''} />
                </td>
                <td style={{ fontWeight: 600 }}>{d.salesOrder?.customer?.companyName}</td>
                <td className="muted">{d.items?.map((i) => `${i.product?.code} ×${i.quantity}`).join(', ') || '—'}</td>
                <td className="doc-no">{d.vehicleNumber}</td>
                <td style={{ fontWeight: 600 }}>{d.driverName}</td>
                <td className="muted">{new Date(d.dispatchDate).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {dispatches.length === 0 && (
          <EmptyState icon={<DispatchesIcon />} title="Nothing dispatched yet" hint="Confirmed orders appear here once dispatched." />
        )}
      </div>
    </div>
  );
}