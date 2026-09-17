import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { InventoryRow } from '../api/types';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { InventoryIcon } from '../components/icons';

export default function Inventory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null);
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    setRows(await api.get<InventoryRow[]>('/inventory'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdjust(row: InventoryRow) {
    setAdjustTarget(row);
    setQty(String(row.physicalQty));
    setError('');
  }

  async function adjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    setError('');
    try {
      await api.patch(`/inventory/${adjustTarget.productId}`, { physicalQty: Number(qty) });
      setFlash(`Stock for ${adjustTarget.productCode} set to ${qty}`);
      setAdjustTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to adjust stock');
    }
  }

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

      {flash && <div className="notice mb">{flash}</div>}

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
              {user?.role === 'ADMIN' && <th className="money">Actions</th>}
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
                  {user?.role === 'ADMIN' && (
                    <td className="money">
                      <button onClick={() => openAdjust(r)}>Adjust</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState icon={<InventoryIcon />} title="Loading stock…" />}
      </div>

      {adjustTarget && (
        <div className="modal-backdrop" onClick={() => setAdjustTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adjust stock — {adjustTarget.productCode}</h2>
              <div className="sub">{adjustTarget.productName} · physical stock adjustment</div>
            </div>
            <form className="form" onSubmit={adjust}>
              <div className="modal-body">
                <div className="card" style={{ padding: '10px 14px', display: 'flex', gap: 18, marginBottom: 14 }}>
                  <span><span className="label">Reserved </span><strong className="money" style={{ color: 'var(--amber)' }}>{adjustTarget.reservedQty}</strong></span>
                  <span><span className="label">Available </span><strong className="money" style={{ color: 'var(--green)' }}>{adjustTarget.availableQty}</strong></span>
                </div>
                <label>
                  New physical quantity
                  <input type="number" min={adjustTarget.reservedQty} value={qty} onChange={(e) => setQty(e.target.value)} required />
                </label>
                <div className="sub muted" style={{ fontSize: '0.78rem' }}>
                  Cannot be set below the {adjustTarget.reservedQty} unit(s) already reserved.
                </div>
              </div>
              {error && <div className="error" style={{ padding: '0 22px' }}>{error}</div>}
              <div className="modal-foot">
                <button type="button" onClick={() => setAdjustTarget(null)}>Cancel</button>
                <button className="primary" type="submit">Save stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
