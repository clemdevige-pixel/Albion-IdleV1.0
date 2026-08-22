import type { SaveProvider } from "@game/persistence";
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  normalizeDashboardSectionOrder,
  type DashboardSectionId,
} from "../data/dashboardLayoutCatalog";

interface DashboardLayoutSnapshotV1 {
  readonly version: 1;
  readonly order: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class DashboardLayoutSaveProvider implements SaveProvider {
  readonly providerId = "dashboard-layout";

  private order: DashboardSectionId[] = [...DEFAULT_DASHBOARD_SECTION_ORDER];

  getOrder = (): readonly DashboardSectionId[] => [...this.order];

  setOrder = (order: readonly DashboardSectionId[]): void => {
    this.order = normalizeDashboardSectionOrder(order);
  };

  save(): DashboardLayoutSnapshotV1 {
    return {
      version: 1,
      order: [...this.order],
    };
  }

  load(data: unknown): void {
    if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.order)) {
      this.order = [...DEFAULT_DASHBOARD_SECTION_ORDER];
      return;
    }

    const rawOrder = data.order.filter((value): value is string => typeof value === "string");
    this.order = normalizeDashboardSectionOrder(rawOrder);
  }
}
