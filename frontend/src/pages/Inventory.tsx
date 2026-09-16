import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { InventoryRow } from '../api/types';

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
      <div className="page-head">
        <div>
          <h1>Inventory Availability</h1>
          <div className="sub">
            available = physical − reserved. Confirmations reserve stock; dispatches consume it.
          </div>
        </div>
        <div className="flex">
          <div className="card" style={{ padding: '10px 16px' }}>
            <span className="label">Physical </span>
            <strong>{total.physical.toLocaleString()}</strong>
            <span className="muted"> · </span>
            <span className="label">Reserved </span>
            <strong className="money" style={{ color: 'var(--amber)' }}>{total.reserved.toLocaleString()}</strong>
            <span className="muted"> · </span>
            <span className="label">Available </span>
            <strong className="money" style={{ color: 'var(--green)' }}>{total.available.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Product</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Physical</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const util = r.physicalQty > 0 ? Math.round((r.reservedQty / r.physicalQty) * 100) : 0;
              return (
                <tr key={r.productId}>
                  <td>{r.productCode}</td>
                  <td>{r.productName}</td>
                  <td>{r.category}</td>
                  <td>{r.unit}</td>
                  <td>{r.physicalQty}</td>
                  <td>{r.reservedQty}</td>
                  <td style={{ color: r.availableQty < 0 ? 'var(--red)' : 'var(--green)' }}>{r.availableQty}</td>
                  <td>{util}%</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">Loading…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}