import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import {
  RELIC_OBJECTIVE_COUNT,
  type RegisterRelicResult,
  type RelicDefinition,
  type RelicId,
  type RelicObjectiveRequirement,
  type RelicProgressPort,
  type RelicProgressView,
  type RelicReconstructionPort,
} from "./types.js";

const RelicSnapshotSchema = z.object({
  version: z.literal(1),
  reconstructedRelicIds: z.array(z.string().min(1)),
});

type RelicSnapshot = z.infer<typeof RelicSnapshotSchema>;

const DEFAULT_RECONSTRUCTION_PORT: RelicReconstructionPort = {
  canReconstructRelic: () => true,
};

/**
 * Deterministic Relic reconstruction domain.
 * Objective progress is always derived from existing authoritative progression
 * sources. Only permanent reconstruction is persisted; fragments are not items
 * or a second currency and are never stored separately.
 */
export class RelicService implements SaveProvider {
  readonly providerId = "relics";

  readonly #definitions = new Map<RelicId, RelicDefinition>();
  readonly #reconstructedRelicIds = new Set<RelicId>();
  readonly #progressPort: RelicProgressPort;
  readonly #reconstructionPort: RelicReconstructionPort;

  constructor(
    progressPort: RelicProgressPort,
    reconstructionPort: RelicReconstructionPort = DEFAULT_RECONSTRUCTION_PORT,
  ) {
    this.#progressPort = progressPort;
    this.#reconstructionPort = reconstructionPort;
  }

  registerRelic(definition: RelicDefinition): RegisterRelicResult {
    if (!this.#isValidDefinition(definition)) return { ok: false, reason: "invalid_definition" };
    if (this.#definitions.has(definition.id)) return { ok: false, reason: "duplicate_relic" };
    this.#definitions.set(definition.id, definition);
    return { ok: true };
  }

  getDefinition(relicId: RelicId): RelicDefinition | undefined {
    return this.#definitions.get(relicId);
  }

  isReconstructed(relicId: RelicId): boolean {
    return this.#reconstructedRelicIds.has(relicId);
  }

  getProgress(relicId: RelicId): RelicProgressView | undefined {
    const definition = this.#definitions.get(relicId);
    if (definition === undefined) return undefined;
    const completedObjectiveIds = definition.objectives
      .filter((objective) => this.#isRequirementMet(objective.requirement))
      .map((objective) => objective.id);
    return {
      relicId,
      completedObjectiveIds,
      fragmentCount: completedObjectiveIds.length,
      reconstructed: this.#reconstructedRelicIds.has(relicId),
    };
  }

  /**
   * Resolves all newly completed Relics automatically after authoritative
   * progression changes. Objective history can complete before reconstruction
   * is enabled; permanent reconstruction waits for its owning authority.
   */
  resolveCompletedRelics(): readonly RelicId[] {
    const newlyReconstructed: RelicId[] = [];
    for (const definition of this.#definitions.values()) {
      if (this.#reconstructedRelicIds.has(definition.id)) continue;
      if (!this.#reconstructionPort.canReconstructRelic(definition)) continue;
      const complete = definition.objectives.every((objective) => (
        this.#isRequirementMet(objective.requirement)
      ));
      if (!complete) continue;
      this.#reconstructedRelicIds.add(definition.id);
      newlyReconstructed.push(definition.id);
    }
    return newlyReconstructed;
  }

  save(): RelicSnapshot {
    return {
      version: 1,
      reconstructedRelicIds: [...this.#reconstructedRelicIds],
    };
  }

  load(data: unknown): void {
    const parsed = RelicSnapshotSchema.safeParse(data);
    if (!parsed.success) return;
    this.#reconstructedRelicIds.clear();
    for (const relicId of new Set(parsed.data.reconstructedRelicIds)) {
      if (this.#definitions.has(relicId)) this.#reconstructedRelicIds.add(relicId);
    }
  }

  #isRequirementMet(requirement: RelicObjectiveRequirement): boolean {
    switch (requirement.type) {
      case "all_monsters_killed":
        return requirement.monsterIds.every((monsterId) => (
          this.#progressPort.getMonsterKillCount(monsterId) >= requirement.minimumEach
        ));
      case "monster_kill_count":
        return this.#progressPort.getMonsterKillCount(requirement.monsterId) >= requirement.minimum;
      case "faction_kill_count":
        return this.#progressPort.getFactionKillCount(requirement.factionId) >= requirement.minimum;
      case "faction_elite_kill_count":
        return this.#progressPort.getFactionEliteKillCount(requirement.factionId) >= requirement.minimum;
      case "world_segment_progress":
        return this.#progressPort.getCompletedSegmentCount(requirement.zoneDefId)
          >= requirement.minimumCompletedSegments;
    }
  }

  #isValidDefinition(definition: RelicDefinition): boolean {
    if (definition.id.trim() === "" || definition.factionId.trim() === "") return false;
    if (definition.objectives.length !== RELIC_OBJECTIVE_COUNT) return false;
    const objectiveIds = definition.objectives.map((objective) => objective.id);
    if (objectiveIds.some((id) => id.trim() === "")) return false;
    if (new Set(objectiveIds).size !== objectiveIds.length) return false;

    return definition.objectives.every((objective) => {
      const requirement = objective.requirement;
      switch (requirement.type) {
        case "all_monsters_killed":
          return requirement.monsterIds.length > 0
            && requirement.monsterIds.every((id) => id.trim() !== "")
            && Number.isInteger(requirement.minimumEach)
            && requirement.minimumEach > 0;
        case "monster_kill_count":
          return requirement.monsterId.trim() !== ""
            && Number.isInteger(requirement.minimum)
            && requirement.minimum > 0;
        case "faction_kill_count":
        case "faction_elite_kill_count":
          return requirement.factionId.trim() !== ""
            && Number.isInteger(requirement.minimum)
            && requirement.minimum > 0;
        case "world_segment_progress":
          return requirement.zoneDefId.trim() !== ""
            && Number.isInteger(requirement.minimumCompletedSegments)
            && requirement.minimumCompletedSegments > 0;
      }
    });
  }
}
