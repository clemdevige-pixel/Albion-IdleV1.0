import "./dashboard.css";
import {
  useDashboardProduction,
  useDashboardYield,
  useDashboardZone,
  useDashboardZoneActions,
} from "./useDashboardData";
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

  return (
    <div className="dashboard-module">
      <DashboardCombatCard
        zone={zone}
        onSetFarmMode={zoneActions.setFarmMode}
      />
      <DashboardYieldCard yieldData={yieldData} />
      <DashboardEnchantReadyCard />
      <DashboardTrackedResourcesCard />
      <DashboardProductionCard production={production} />
    </div>
  );
}
