import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  footnote?: ReactNode;
  accent?: 'default' | 'green' | 'amber' | 'red';
}

export default function StatCard({ label, value, footnote, accent = 'default' }: Props) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent === 'default' ? '' : `accent-${accent}`}`}>{value}</div>
      {footnote && <div className="stat-foot">{footnote}</div>}
    </div>
  );
}