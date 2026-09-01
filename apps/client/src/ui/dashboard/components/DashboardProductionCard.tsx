import type { IslandBuildingId } from "@game/data";
import { ActiveGatheringGame } from "../../../hud/ActiveGatheringGame";
import {
  PRODUCTION_FAMILY_CATALOG,
  PRODUCTION_TIERS,
  getProductionTierPresentation,
} from "../../../data/productionFamilyCatalog";
import { useGameBridge } from "../../../state/GameContext";
import { useIslandSelection } from "../../island/IslandSelectionContext";
import { useNavigation } from "../../navigation";
import { UI_MODULE_IDS } from "../../navigation/moduleIds";
import { findWorkerGatheringBuilding } from "../../shared/findWorkerGatheringBuilding";
import type { DashboardProductionModel, DashboardProductionTask } from "../dashboardModels";
import { useDashboardGatheringActions } from "../useDashboardData";
import { DashboardCard } from "./DashboardCard";
import "./DashboardProductionCard.css";

interface DashboardProductionCardProps {
  readonly production: DashboardProductionModel;
}

const KIND_LABELS = {
  gathering: "Récolte",
  refining: "Raffinage",
  worker: "Worker",
} as const;

const RESOURCE_ICONS = Object.values(PRODUCTION_FAMILY_CATALOG).map((family) => ({
  terms: [
    family.label,
    family.rawMaterialLabel,
    ...PRODUCTION_TIERS
      .map((tier) => getProductionTierPresentation(family.gameplayFamily, tier)?.resourceName)
      .filter((resourceName): resourceName is string => resourceName !== undefined),
  ],
  src: family.professionIcon,
}));

const GATHERING_BUILDING_BY_FAMILY: Readonly<Record<string, IslandBuildingId>> = {
  wood: "lumber_camp",
  ore: "mine",
  hide: "hunting_camp",
  fiber: "fiber_camp",
};

const REFINING_BUILDING_BY_TASK_SUFFIX: Readonly<Record<string, IslandBuildingId>> = {
  wood: "sawmill",
  metal: "smelter",
  leather: "tannery",
  cloth: "weaver",
};

function getTaskIcon(task: DashboardProductionTask): string {
  const searchable = `${task.label} ${task.detail}`.toLocaleLowerCase("fr");
  const resource = RESOURCE_ICONS.find(({ terms }) =>
    terms.some((term) => searchable.includes(term.toLocaleLowerCase("fr"))),
  );
  return resource?.src ?? "/assets/ui/nav-production.png";
}

export function DashboardProductionCard({ production }: DashboardProductionCardProps): JSX.Element | null {
  const actions = useDashboardGatheringActions();
  const bridge = useGameBridge();
  const navigation = useNavigation();
  const islandSelection = useIslandSelection();
  const interaction = production.gatheringInteraction;

  if (production.tasks.length === 0 && interaction === undefined) return null;

  const getTaskBuilding = (task: DashboardProductionTask) => {
    if (task.kind === "worker") {
      const workerId = task.id.startsWith("worker-") ? task.id.slice("worker-".length) : task.id;
      const worker = bridge.workers.workers.find((candidate) => candidate.id === workerId);
      return worker === undefined
        ? undefined
        : findWorkerGatheringBuilding(bridge.island.buildings, worker.profession);
    }

    const suffix = task.id.slice(task.id.indexOf("-") + 1).toLowerCase();
    const definitionId = task.kind === "gathering"
      ? GATHERING_BUILDING_BY_FAMILY[suffix]
      : REFINING_BUILDING_BY_TASK_SUFFIX[suffix];

    return definitionId === undefined
      ? undefined
      : bridge.island.buildings.find((candidate) => candidate.definitionId === definitionId);
  };

  const openTaskBuilding = (task: DashboardProductionTask): void => {
    const building = getTaskBuilding(task);
    if (building === undefined) return;
    islandSelection.selectBuilding(building.plotId, building.instanceId);
    navigation.openModule(UI_MODULE_IDS.island);
  };

  return (
    <DashboardCard
      sectionId="production"
      meta={production.hiddenTaskCount > 0 ? `+${String(production.hiddenTaskCount)} autre${production.hiddenTaskCount > 1 ? "s" : ""}` : undefined}
    >
      {production.tasks.length > 0 && (
        <div className="dashboard-production__list">
          {production.tasks.map((task) => {
            const targetBuilding = getTaskBuilding(task);
            return (
              <button
                type="button"
                key={task.id}
                className="dashboard-production__task"
                disabled={targetBuilding === undefined}
                onClick={() => { openTaskBuilding(task); }}
                title={targetBuilding === undefined ? undefined : "Ouvrir le bâtiment concerné"}
              >
                <span className="dashboard-production__visual" aria-hidden="true">
                  <img src={getTaskIcon(task)} alt="" />
                </span>
                <div>
                  <span>{KIND_LABELS[task.kind]}</span>
                  <strong>{task.label}</strong>
                  <small>{task.detail}</small>
                </div>
                <b><span>{String(Math.round(task.progress))}</span>%</b>
                <div className="dashboard-progress">
                  <span style={{ width: `${String(Math.max(0, Math.min(100, task.progress)))}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
      {interaction !== undefined && (
        <div className="dashboard-production__gathering-controls">
          <ActiveGatheringGame
            cycleId={interaction.cycleId}
            strikesUsed={interaction.strikesUsed}
            activity={interaction.activity}
            yieldMultiplier={interaction.yieldMultiplier}
            speedBonusRatio={interaction.speedBonusRatio}
            nextActivityThreshold={interaction.nextActivityThreshold}
            activityProgressToNext={interaction.activityProgressToNext}
            durationSeconds={interaction.durationSeconds}
            onStrike={(quality) => actions.strike(interaction.resourceFamily, quality)}
          />
          <button type="button" onClick={actions.returnToCombat}>
            Retour au combat
          </button>
        </div>
      )}
    </DashboardCard>
  );
}
