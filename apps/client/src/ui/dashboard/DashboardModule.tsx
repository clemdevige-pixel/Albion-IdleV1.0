import "./dashboard.css";
import "./components/DashboardUtilityCards.css";
import {
  useDashboardProduction,
  useDashboardYield,
  useDashboardZone,
  useDashboardZoneActions,
} from "./useDashboardData";
import {
  DASHBOARD_SECTION_ORDER,
  type DashboardSectionId,
} from "./dashboardSections";
import { DashboardCombatCard } from "./components/DashboardCombatCard";
import { DashboardEnchantReadyCard } from "./components/DashboardEnchantReadyCard";
import { DashboardProductionCard } from "./components/DashboardProductionCard";
import { DashboardTrackedResourcesCard } from "./components/DashboardTrackedResourcesCard";
import { DashboardYieldCard } from "./components/DashboardYieldCard";

export function DashboardModule(): JSX.Element {
  const zone = useDashboardZone();
  const zoneActions = useDashboardZoneActions();
  const production = useDashboardProduction();
  const yieldData = useDashboardYield();

  const sections: Readonly<Record<DashboardSectionId, JSX.Element | null>> = {
    combat: (
      <DashboardCombatCard
        zone={zone}
        onSetFarmMode={zoneActions.setFarmMode}
      />
    ),
    yield: <DashboardYieldCard yieldData={yieldData} />,
    "enchant-ready": <DashboardEnchantReadyCard />,
    "tracked-resources": <DashboardTrackedResourcesCard />,
    production: <DashboardProductionCard production={production} />,
  };

  return (
    <div className="dashboard-module">
      {DASHBOARD_SECTION_ORDER.map((sectionId) => (
        <div key={sectionId} className="dashboard-module__section">
          {sections[sectionId]}
        </div>
      ))}
    </div>
  );
}
