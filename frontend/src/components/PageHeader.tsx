import { type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function PageHeader({ icon, eyebrow, title, description, children }: Props) {
  return (
    <div className="page-head">
      <div className="ph-left">
        {icon && <span className="ph-icon">{icon}</span>}
        <div>
          {eyebrow && <div className="ph-eyebrow">{eyebrow}</div>}
          <h1 className="ph-title">{title}</h1>
          {description && <div className="ph-desc">{description}</div>}
        </div>
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </div>
  );
}
