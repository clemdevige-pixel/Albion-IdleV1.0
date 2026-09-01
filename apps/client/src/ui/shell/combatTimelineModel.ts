import { FACTION_CAPE_FACTIONS, TOWER_BLOCK_SIZE } from "@game/data";
import {
  getTowerFloorDefinition,
  type DungeonDefinition,
  type DungeonRunState,
  type TowerProgressionSnapshot,
} from "@game/gameplay";

export type CombatTimelineMode = "dungeon" | "tower";
export type CombatTimelineNodeKind = "normal" | "reinforced" | "elite" | "boss" | "major-boss";
export type CombatTimelineNodeState = "complete" | "current" | "upcoming";

export interface CombatTimelineNodeModel {
  readonly id: string;
  readonly label: string;
  readonly ariaLabel: string;
  readonly kind: CombatTimelineNodeKind;
  readonly state: CombatTimelineNodeState;
}

export interface CombatTimelineModel {
  readonly mode: CombatTimelineMode;
  readonly title: string;
  readonly subtitle: string;
  readonly railProgress: number;
  readonly nodes: readonly CombatTimelineNodeModel[];
}

function progressPercent(currentIndex: number, nodeCount: number): number {
  if (nodeCount <= 1) return 100;
  return Math.max(0, Math.min(100, (currentIndex / (nodeCount - 1)) * 100));
}

function resolveFactionDisplayName(factionId: string): string {
  return FACTION_CAPE_FACTIONS.find((entry) => entry.factionId === factionId)?.displayName ?? factionId;
}

export function buildDungeonCombatTimeline(
  run: DungeonRunState,
  definition: DungeonDefinition,
): CombatTimelineModel {
  const encounterCount = definition.encounters.length;
  const currentEncounterNumber = Math.min(run.encounterIndex + 1, encounterCount);

  return {
    mode: "dungeon",
    title: `Donjon T${String(definition.tier)} — ${definition.faction}`,
    subtitle: `RENCONTRE ${String(currentEncounterNumber)} / ${String(encounterCount)}`,
    railProgress: progressPercent(run.encounterIndex, encounterCount),
    nodes: definition.encounters.map((encounter, index) => ({
      id: encounter.id,
      label: String(index + 1),
      ariaLabel: `Rencontre ${String(index + 1)} sur ${String(encounterCount)} · ${encounter.kind === "boss" ? "Boss" : encounter.kind === "elite" ? "Élite" : "Normal"}`,
      kind: encounter.kind,
      state: index < run.encounterIndex ? "complete" : index === run.encounterIndex ? "current" : "upcoming",
    })),
  };
}

export function buildTowerCombatTimeline(
  progression: TowerProgressionSnapshot,
): CombatTimelineModel {
  const currentFloor = getTowerFloorDefinition(progression.currentFloor, progression.seed);
  const block = currentFloor.block;
  const factionName = resolveFactionDisplayName(block.factionId);

  return {
    mode: "tower",
    title: `Tour sans fin — Bloc ${String(block.blockIndex + 1)}`,
    subtitle: `ÉTAGES ${String(block.floorStart)}–${String(block.floorEnd)} · T${String(block.tier)} · ${factionName}`,
    railProgress: progressPercent(currentFloor.indexInBlock, TOWER_BLOCK_SIZE),
    nodes: Array.from({ length: TOWER_BLOCK_SIZE }, (_, index) => {
      const floor = block.floorStart + index;
      const definition = getTowerFloorDefinition(floor, progression.seed);
      const kind: CombatTimelineNodeKind = definition.role === "block_boss"
        ? (definition.majorBoss ? "major-boss" : "boss")
        : definition.role;
      const state: CombatTimelineNodeState = floor < progression.currentFloor
        ? "complete"
        : floor === progression.currentFloor
          ? "current"
          : "upcoming";
      const roleLabel = definition.majorBoss
        ? "Boss majeur"
        : definition.role === "block_boss"
          ? "Boss"
          : definition.role === "elite"
            ? "Élite"
            : definition.role === "reinforced"
              ? "Renforcé"
              : "Normal";

      return {
        id: `tower-floor-${String(floor)}`,
        label: String(floor),
        ariaLabel: `Étage ${String(floor)} · ${roleLabel}`,
        kind,
        state,
      };
    }),
  };
}
