export const DASHBOARD_SECTION_IDS = [
  "combat",
  "research",
  "yield",
  "enchant-ready",
  "tracked-resources",
  "production",
  "black-market-convoy",
  "player",
  "zone",
  "activity",
  "session",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export const DEFAULT_DASHBOARD_SECTION_ORDER = [
  "combat",
  "research",
  "yield",
  "enchant-ready",
  "production",
  "black-market-convoy",
] as const satisfies readonly DashboardSectionId[];

const DASHBOARD_SECTION_ID_SET = new Set<string>(DASHBOARD_SECTION_IDS);

export function isDashboardSectionId(value: string): value is DashboardSectionId {
  return DASHBOARD_SECTION_ID_SET.has(value);
}

export function normalizeDashboardSectionOrder(
  order: readonly string[],
  defaultOrder: readonly DashboardSectionId[] = DEFAULT_DASHBOARD_SECTION_ORDER,
): DashboardSectionId[] {
  const allowed = new Set<DashboardSectionId>(defaultOrder);
  const seen = new Set<DashboardSectionId>();
  const normalized: DashboardSectionId[] = [];

  for (const value of order) {
    if (!isDashboardSectionId(value) || !allowed.has(value) || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  for (const sectionId of defaultOrder) {
    if (seen.has(sectionId)) continue;
    normalized.push(sectionId);
  }

  return normalized;
}

export function moveDashboardSection(
  order: readonly DashboardSectionId[],
  sourceId: DashboardSectionId,
  targetId: DashboardSectionId,
): DashboardSectionId[] {
  if (sourceId === targetId) return [...order];
  const sourceIndex = order.indexOf(sourceId);
  const targetIndex = order.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return [...order];

  const next = [...order];
  const [moved] = next.splice(sourceIndex, 1);
  if (moved === undefined) return [...order];
  next.splice(targetIndex, 0, moved);
  return next;
}
