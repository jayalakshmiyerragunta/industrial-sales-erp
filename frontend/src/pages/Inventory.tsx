import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { InventoryRow } from '../api/types';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { InventoryIcon } from '../components/icons';

export default function Inventory() {
  const [rows, setRows] = useState<InventoryRow[]>([]);

  useEffect(() => {
    void api.get<InventoryRow[]>('/inventory').then(setRows);
  }, []);

  const total = { physical: 0, reserved: 0, available: 0 };
  for (const r of rows) {
    total.physical += r.physicalQty;
    total.reserved += r.reservedQty;
    total.available += r.availableQty;
  }

  return (
    <div>
      <PageHeader
        icon={<InventoryIcon />}
        eyebrow="Stock"
        title="Inventory Availability"
        description="available = physical − reserved. Confirmations reserve stock; dispatches consume it."
      >
        <div className="card" style={{ padding: '9px 16px', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <span><span className="label">Physical </span><strong className="money">{total.physical.toLocaleString()}</strong></span>
          <span><span className="label">Reserved </span><strong className="money" style={{ color: 'var(--amber)' }}>{total.reserved.toLocaleString()}</strong></span>
          <span><span className="label">Available </span><strong className="money" style={{ color: 'var(--green)' }}>{total.available.toLocaleString()}</strong></span>
        </div>
      </PageHeader>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Product</th>
              <th>Category</th>
              <th>Unit</th>
              <th className="money">Physical</th>
              <th className="money">Reserved</th>
              <th className="money">Available</th>
              <th className="money">Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const util = r.physicalQty > 0 ? Math.round((r.reservedQty / r.physicalQty) * 100) : 0;
              return (
                <tr key={r.productId}>
                  <td className="doc-no">{r.productCode}</td>
                  <td style={{ fontWeight: 600 }}>{r.productName}</td>
                  <td>{r.category}</td>
                  <td>{r.unit}</td>
                  <td className="money">{r.physicalQty}</td>
                  <td className="money">{r.reservedQty}</td>
                  <td className="money" style={{ color: r.availableQty < 0 ? 'var(--red)' : 'var(--ink-2)' }}>{r.availableQty}</td>
                  <td className="money" style={{ color: util >= 90 ? 'var(--red)' : util >= 70 ? 'var(--amber)' : 'var(--ink-2)' }}>{util}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState icon={<InventoryIcon />} title="Loading stock…" />}
      </div>
    </div>
  );
}