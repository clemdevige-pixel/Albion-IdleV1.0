export const DASHBOARD_SECTION_IDS = [
  "combat",
  "yield",
  "enchant-ready",
  "tracked-resources",
  "production",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export interface DashboardSectionDefinition {
  readonly id: DashboardSectionId;
  readonly title: string;
  readonly iconSrc: string;
  readonly className: string;
}

export const DASHBOARD_SECTION_DEFINITIONS: Readonly<Record<DashboardSectionId, DashboardSectionDefinition>> = {
  combat: {
    id: "combat",
    title: "Combat",
    iconSrc: "/assets/ui/nav-world.png",
    className: "dashboard-card--combat",
  },
  yield: {
    id: "yield",
    title: "Rendement",
    iconSrc: "/assets/ui/nav-masteries.png",
    className: "dashboard-card--yield",
  },
  "enchant-ready": {
    id: "enchant-ready",
    title: "Enchantement prêt",
    iconSrc: "/assets/ui/nav-merchant.png",
    className: "dashboard-card--enchant-ready",
  },
  "tracked-resources": {
    id: "tracked-resources",
    title: "Ressources suivies",
    iconSrc: "/assets/ui/nav-production.png",
    className: "dashboard-card--tracked-resources",
  },
  production: {
    id: "production",
    title: "Production",
    iconSrc: "/assets/ui/nav-production.png",
    className: "dashboard-card--production",
  },
};

export const DASHBOARD_SECTION_ORDER: readonly DashboardSectionId[] = DASHBOARD_SECTION_IDS;

export function getDashboardSectionDefinition(sectionId: DashboardSectionId): DashboardSectionDefinition {
  return DASHBOARD_SECTION_DEFINITIONS[sectionId];
}
