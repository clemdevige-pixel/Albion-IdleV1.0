import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  type DashboardSectionId,
} from "../../data/dashboardLayoutCatalog";

export { DASHBOARD_SECTION_IDS, type DashboardSectionId } from "../../data/dashboardLayoutCatalog";

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
  research: {
    id: "research",
    title: "Académie",
    iconSrc: "/assets/ui/nav-island.png",
    className: "dashboard-card--research",
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
  "black-market-convoy": {
    id: "black-market-convoy",
    title: "Cargo Black Market",
    iconSrc: "/assets/ui/nav-merchant.png",
    className: "dashboard-card--black-market-convoy",
  },
  player: {
    id: "player",
    title: "Personnage",
    iconSrc: "/assets/ui/nav-character.png",
    className: "dashboard-card--player",
  },
  zone: {
    id: "zone",
    title: "Zone actuelle",
    iconSrc: "/assets/ui/nav-world.png",
    className: "dashboard-card--zone",
  },
  activity: {
    id: "activity",
    title: "Activité récente",
    iconSrc: "/assets/ui/nav-inventory.png",
    className: "dashboard-card--activity",
  },
  session: {
    id: "session",
    title: "Session",
    iconSrc: "/assets/ui/nav-masteries.png",
    className: "dashboard-card--session",
  },
};

export const DASHBOARD_SECTION_ORDER = DEFAULT_DASHBOARD_SECTION_ORDER;

export function getDashboardSectionDefinition(sectionId: DashboardSectionId): DashboardSectionDefinition {
  return DASHBOARD_SECTION_DEFINITIONS[sectionId];
}
