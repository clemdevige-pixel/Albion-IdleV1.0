import type { ReactNode } from "react";
import { PanelSurface } from "../../shared";

interface DashboardCardProps {
  readonly title: string;
  readonly iconSrc?: string;
  readonly meta?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export function DashboardCard({
  title,
  iconSrc,
  meta,
  className = "",
  children,
}: DashboardCardProps): JSX.Element {
  return (
    <PanelSurface className={`dashboard-card ${className}`.trim()}>
      <header className="dashboard-card__header">
        <h2>
          {iconSrc !== undefined && (
            <span className="dashboard-card__icon" aria-hidden="true">
              <img src={iconSrc} alt="" draggable={false} />
            </span>
          )}
          {title}
        </h2>
        {meta !== undefined && <div className="dashboard-card__meta">{meta}</div>}
      </header>
      <div className="dashboard-card__body">{children}</div>
    </PanelSurface>
  );
}
