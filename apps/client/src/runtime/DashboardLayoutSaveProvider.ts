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

interface DashboardLayoutSnapshotV2 {
  readonly version: 2;
  readonly order: readonly string[];
  readonly ignoredEnchantInstanceIds: readonly string[];
}

interface DashboardLayoutSnapshotV3 {
  readonly version: 3;
  readonly order: readonly string[];
  readonly ignoredEnchantInstanceIds: readonly string[];
  readonly acknowledgedFeatureUnlockIds: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class DashboardLayoutSaveProvider implements SaveProvider {
  readonly providerId = "dashboard-layout";

  private order: DashboardSectionId[] = [...DEFAULT_DASHBOARD_SECTION_ORDER];
  private ignoredEnchantInstanceIds = new Set<string>();
  private acknowledgedFeatureUnlockIds = new Set<string>();
  private readonly listeners = new Set<() => void>();

  getOrder = (): readonly DashboardSectionId[] => this.order;
  getIgnoredEnchantInstanceIds = (): ReadonlySet<string> => this.ignoredEnchantInstanceIds;
  getAcknowledgedFeatureUnlockIds = (): ReadonlySet<string> => this.acknowledgedFeatureUnlockIds;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  reset = (): void => {
    const orderChanged = this.replaceOrder(DEFAULT_DASHBOARD_SECTION_ORDER, false);
    const ignoredChanged = this.ignoredEnchantInstanceIds.size > 0;
    const acknowledgedChanged = this.acknowledgedFeatureUnlockIds.size > 0;
    this.ignoredEnchantInstanceIds = new Set();
    this.acknowledgedFeatureUnlockIds = new Set();
    if (orderChanged || ignoredChanged || acknowledgedChanged) this.emitChange();
  };

  setOrder = (order: readonly DashboardSectionId[]): void => {
    if (this.replaceOrder(normalizeDashboardSectionOrder(order), false)) this.emitChange();
  };

  ignoreEnchantInstance = (instanceId: string): void => {
    if (this.ignoredEnchantInstanceIds.has(instanceId)) return;
    this.ignoredEnchantInstanceIds = new Set([...this.ignoredEnchantInstanceIds, instanceId]);
    this.emitChange();
  };

  restoreEnchantInstance = (instanceId: string): void => {
    if (!this.ignoredEnchantInstanceIds.has(instanceId)) return;
    const next = new Set(this.ignoredEnchantInstanceIds);
    next.delete(instanceId);
    this.ignoredEnchantInstanceIds = next;
    this.emitChange();
  };

  acknowledgeFeatureUnlock = (unlockId: string): void => {
    if (this.acknowledgedFeatureUnlockIds.has(unlockId)) return;
    this.acknowledgedFeatureUnlockIds = new Set([...this.acknowledgedFeatureUnlockIds, unlockId]);
    this.emitChange();
  };

  acknowledgeFeatureUnlocks = (unlockIds: readonly string[]): void => {
    const missing = unlockIds.filter((unlockId) => !this.acknowledgedFeatureUnlockIds.has(unlockId));
    if (missing.length === 0) return;
    this.acknowledgedFeatureUnlockIds = new Set([...this.acknowledgedFeatureUnlockIds, ...missing]);
    this.emitChange();
  };

  save(): DashboardLayoutSnapshotV3 {
    return {
      version: 3,
      order: [...this.order],
      ignoredEnchantInstanceIds: [...this.ignoredEnchantInstanceIds],
      acknowledgedFeatureUnlockIds: [...this.acknowledgedFeatureUnlockIds],
    };
  }

  load(data: unknown): void {
    if (!isRecord(data) || (data.version !== 1 && data.version !== 2 && data.version !== 3) || !Array.isArray(data.order)) {
      this.reset();
      return;
    }

    const rawOrder = data.order.filter((value): value is string => typeof value === "string");
    const nextOrder = normalizeDashboardSectionOrder(rawOrder);
    const nextIgnored = (data.version === 2 || data.version === 3) && Array.isArray(data.ignoredEnchantInstanceIds)
      ? new Set(data.ignoredEnchantInstanceIds.filter((value): value is string => typeof value === "string"))
      : new Set<string>();
    const nextAcknowledged = data.version === 3 && Array.isArray(data.acknowledgedFeatureUnlockIds)
      ? new Set(data.acknowledgedFeatureUnlockIds.filter((value): value is string => typeof value === "string"))
      : new Set<string>();

    const orderChanged = this.replaceOrder(nextOrder, false);
    const ignoredChanged = !this.sameStringSet(this.ignoredEnchantInstanceIds, nextIgnored);
    const acknowledgedChanged = !this.sameStringSet(this.acknowledgedFeatureUnlockIds, nextAcknowledged);
    this.ignoredEnchantInstanceIds = nextIgnored;
    this.acknowledgedFeatureUnlockIds = nextAcknowledged;
    if (orderChanged || ignoredChanged || acknowledgedChanged) this.emitChange();
  }

  private replaceOrder(order: readonly DashboardSectionId[], emit = true): boolean {
    const next = [...order];
    if (
      next.length === this.order.length
      && next.every((sectionId, index) => sectionId === this.order[index])
    ) {
      return false;
    }

    this.order = next;
    if (emit) this.emitChange();
    return true;
  }

  private sameStringSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    if (left.size !== right.size) return false;
    for (const value of left) {
      if (!right.has(value)) return false;
    }
    return true;
  }

  private emitChange(): void {
    for (const listener of this.listeners) listener();
  }
}

export const dashboardLayoutSaveProvider = new DashboardLayoutSaveProvider();
