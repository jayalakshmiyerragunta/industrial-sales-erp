import { type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export default function EmptyState({ icon, title, hint, action, children }: Props) {
  const cta = children ?? action;
  return (
    <div className="empty-state">
      {icon && <span className="empty-state__icon">{icon}</span>}
      <div className="empty-state__title">{title}</div>
      {hint && <div className="empty-state__hint">{hint}</div>}
      {cta && <div className="empty-state__action">{cta}</div>}
    </div>
  );
}
