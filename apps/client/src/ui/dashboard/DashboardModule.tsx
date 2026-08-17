import "./dashboard.css";
import {
  useDashboardPlayer,
  useDashboardProduction,
  useDashboardYield,
  useDashboardZone,
  useDashboardZoneActions,
} from "./useDashboardData";
import { DashboardCombatCard } from "./components/DashboardCombatCard";
import { DashboardPlayerCard } from "./components/DashboardPlayerCard";
import { DashboardProductionCard } from "./components/DashboardProductionCard";
import { DashboardYieldCard } from "./components/DashboardYieldCard";

export function DashboardModule(): JSX.Element {
  const player = useDashboardPlayer();
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
      <DashboardPlayerCard player={player} />
      <DashboardYieldCard yieldData={yieldData} />
      <DashboardProductionCard production={production} />
    </div>
  );
}
