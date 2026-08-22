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
  private readonly listeners = new Set<() => void>();

  getOrder = (): readonly DashboardSectionId[] => this.order;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  reset = (): void => {
    this.replaceOrder(DEFAULT_DASHBOARD_SECTION_ORDER);
  };

  setOrder = (order: readonly DashboardSectionId[]): void => {
    this.replaceOrder(normalizeDashboardSectionOrder(order));
  };

  save(): DashboardLayoutSnapshotV1 {
    return {
      version: 1,
      order: [...this.order],
    };
  }

  load(data: unknown): void {
    if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.order)) {
      this.reset();
      return;
    }

    const rawOrder = data.order.filter((value): value is string => typeof value === "string");
    this.replaceOrder(normalizeDashboardSectionOrder(rawOrder));
  }

  private replaceOrder(order: readonly DashboardSectionId[]): void {
    const next = [...order];
    if (
      next.length === this.order.length
      && next.every((sectionId, index) => sectionId === this.order[index])
    ) {
      return;
    }

    this.order = next;
    for (const listener of this.listeners) listener();
  }
}

export const dashboardLayoutSaveProvider = new DashboardLayoutSaveProvider();
