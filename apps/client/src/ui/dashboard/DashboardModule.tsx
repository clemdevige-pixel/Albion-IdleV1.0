import { Fragment } from "react";
import "./dashboard.css";
import "./components/DashboardUtilityCards.css";
import {
  useDashboardProduction,
  useDashboardYield,
  useDashboardZone,
  useDashboardZoneActions,
} from "./useDashboardData";
import { DASHBOARD_SECTION_ORDER } from "./dashboardSections";
import { DashboardCombatCard } from "./components/DashboardCombatCard";
import { DashboardEnchantReadyCard } from "./components/DashboardEnchantReadyCard";
import { DashboardProductionCard } from "./components/DashboardProductionCard";
import { DashboardResearchCard } from "./components/DashboardResearchCard";
import { DashboardTrackedResourcesCard } from "./components/DashboardTrackedResourcesCard";
import { DashboardYieldCard } from "./components/DashboardYieldCard";

type DashboardMountedSectionId = (typeof DASHBOARD_SECTION_ORDER)[number];

export function DashboardModule(): JSX.Element {
  const zone = useDashboardZone();
  const zoneActions = useDashboardZoneActions();
  const production = useDashboardProduction();
  const yieldData = useDashboardYield();

  const sections: Readonly<Record<DashboardMountedSectionId, JSX.Element | null>> = {
    combat: (
      <DashboardCombatCard
        zone={zone}
        onSetFarmMode={zoneActions.setFarmMode}
      />
    ),
    research: <DashboardResearchCard />,
    yield: <DashboardYieldCard yieldData={yieldData} />,
    "enchant-ready": <DashboardEnchantReadyCard />,
    "tracked-resources": <DashboardTrackedResourcesCard />,
    production: <DashboardProductionCard production={production} />,
  };

  return (
    <div className="dashboard-module">
      {DASHBOARD_SECTION_ORDER.map((sectionId) => (
        <Fragment key={sectionId}>{sections[sectionId]}</Fragment>
      ))}
    </div>
  );
}
