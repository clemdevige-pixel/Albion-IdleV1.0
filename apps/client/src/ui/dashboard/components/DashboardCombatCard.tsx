import { CombatStopButton } from "../../combat-hud/CombatStopButton";
import type { DashboardZoneModel } from "../dashboardModels";
import { DashboardCard } from "./DashboardCard";

interface DashboardCombatCardProps {
  readonly zone: DashboardZoneModel;
  readonly onSetFarmMode: (enabled: boolean) => void;
}

export function DashboardCombatCard({
  zone,
  onSetFarmMode,
}: DashboardCombatCardProps): JSX.Element {
  return (
    <DashboardCard
      title="Combat"
      iconSrc="/assets/ui/nav-world.png"
      className="dashboard-card--combat"
      meta={<span className="dashboard-combat__encounter">Encounter {String(zone.encounterIndex)} / {String(zone.encounterCount)}</span>}
    >
      <div className="dashboard-combat">
        <div className="dashboard-combat__modes" aria-label="Mode de combat">
          <button
            type="button"
            className={zone.farmMode ? "" : "is-active"}
            aria-pressed={!zone.farmMode}
            onClick={() => { onSetFarmMode(false); }}
          >
            Progression
          </button>
          <button
            type="button"
            className={zone.farmMode ? "is-active" : ""}
            aria-pressed={zone.farmMode}
            onClick={() => { onSetFarmMode(true); }}
          >
            Farm
          </button>
        </div>
        <div className="dashboard-combat__stop">
          <CombatStopButton />
        </div>
      </div>
    </DashboardCard>
  );
}
