import type { ReactNode } from "react";
import { PanelSurface } from "../../shared";
import {
  getDashboardSectionDefinition,
  type DashboardSectionId,
} from "../dashboardSections";

interface DashboardCardProps {
  readonly sectionId: DashboardSectionId;
  readonly meta?: ReactNode;
  readonly children: ReactNode;
}

export function DashboardCard({
  sectionId,
  meta,
  children,
}: DashboardCardProps): JSX.Element {
  const definition = getDashboardSectionDefinition(sectionId);

  return (
    <PanelSurface
      className={`dashboard-card ${definition.className}`}
      data-dashboard-section={definition.id}
    >
      <header className="dashboard-card__header">
        <h2>
          <span className="dashboard-card__icon" aria-hidden="true">
            <img src={definition.iconSrc} alt="" draggable={false} />
          </span>
          {definition.title}
        </h2>
        {meta !== undefined && <div className="dashboard-card__meta">{meta}</div>}
      </header>
      <div className="dashboard-card__body">{children}</div>
    </PanelSurface>
  );
}
