import type { ReactNode } from "react";
import { PanelSurface } from "../../shared";
import {
  getDashboardSectionDefinition,
  type DashboardSectionId,
} from "../dashboardSections";
import { useDashboardSort } from "../DashboardSortContext";

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
  const dashboardSort = useDashboardSort();

  return (
    <PanelSurface
      className={`dashboard-card ${definition.className}`}
      data-dashboard-section={definition.id}
    >
      <header
        className={`dashboard-card__header${dashboardSort === null ? "" : " is-draggable"}`}
        draggable={dashboardSort !== null}
        tabIndex={dashboardSort === null ? undefined : 0}
        aria-label={dashboardSort === null ? undefined : `Déplacer ${definition.title}`}
        title={dashboardSort === null ? undefined : "Glisser pour déplacer · flèches haut/bas au clavier"}
        onDragStart={dashboardSort === null
          ? undefined
          : (event) => { dashboardSort.beginDrag(event, sectionId); }}
        onDragEnd={dashboardSort === null
          ? undefined
          : dashboardSort.endDrag}
        onKeyDown={dashboardSort === null
          ? undefined
          : (event) => { dashboardSort.handleKeyDown(event, sectionId); }}
      >
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
