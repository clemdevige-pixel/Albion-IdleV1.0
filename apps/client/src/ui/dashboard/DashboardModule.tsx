import "./dashboard.css";
import {
  useDashboardActivity,
  useDashboardPlayer,
  useDashboardProduction,
  useDashboardSession,
  useDashboardZone,
  useDashboardZoneActions,
} from "./useDashboardData";
import { DashboardActivityCard } from "./components/DashboardActivityCard";
import { DashboardPlayerCard } from "./components/DashboardPlayerCard";
import { DashboardProductionCard } from "./components/DashboardProductionCard";
import { DashboardSessionCard } from "./components/DashboardSessionCard";
import { DashboardZoneCard } from "./components/DashboardZoneCard";

export function DashboardModule(): JSX.Element {
  const player = useDashboardPlayer();
  const zone = useDashboardZone();
  const zoneActions = useDashboardZoneActions();
  const production = useDashboardProduction();
  const activity = useDashboardActivity();
  const session = useDashboardSession();

  return (
    <div className="dashboard-module">
      <DashboardZoneCard
        zone={zone}
        onSelectSegment={zoneActions.selectZoneSegment}
        onSetFarmMode={zoneActions.setFarmMode}
      />
      <DashboardPlayerCard player={player} />
      <DashboardProductionCard production={production} />
      <DashboardActivityCard entries={activity} />
      <DashboardSessionCard session={session} />
    </div>
  );
}
