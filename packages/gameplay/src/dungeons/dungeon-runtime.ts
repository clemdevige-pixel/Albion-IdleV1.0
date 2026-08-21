import type { EntityId } from "@game/core";
import type { InventoryManager } from "../inventory/index.js";

export type DungeonEncounterKind = "normal" | "elite" | "boss";
export type DungeonRunStatus = "active" | "cleared" | "failed" | "abandoned";

export interface DungeonEncounterDefinition {
  readonly id: string;
  readonly kind: DungeonEncounterKind;
  /** Existing monster-content definition used by the shared combat runtime. */
  readonly monsterDefinitionId: string;
}

export interface DungeonDefinition {
  readonly id: string;
  readonly tier: number;
  readonly faction: string;
  readonly keyItemId: string;
  /** Resolves the authored combat curve without coupling GameContext to a dungeon. */
  readonly combatProfileId: string;
  /** Resolves dungeon rewards without coupling the reward runtime to a faction. */
  readonly lootTableId: string;
  readonly encounters: readonly DungeonEncounterDefinition[];
}

export interface DungeonRunState {
  readonly definitionId: string;
  readonly status: DungeonRunStatus;
  readonly encounterIndex: number;
  readonly completedEncounterIds: readonly string[];
}

export type DungeonStartFailureReason =
  | "run_already_active"
  | "missing_key"
  | "progression_locked"
  | "invalid_definition";

export type DungeonStartResult =
  | { readonly ok: true; readonly state: DungeonRunState }
  | { readonly ok: false; readonly reason: DungeonStartFailureReason };

export type DungeonAdvanceFailureReason = "no_active_run" | "encounter_mismatch";

export type DungeonAdvanceResult =
  | { readonly ok: true; readonly state: DungeonRunState }
  | { readonly ok: false; readonly reason: DungeonAdvanceFailureReason };

/** Owns only the deterministic lifecycle and permanent clear progression of dungeon attempts. */
export class DungeonRuntime {
  readonly #definitions = new Map<string, DungeonDefinition>();
  readonly #clearedDefinitionIds = new Set<string>();
  #activeRun: DungeonRunState | undefined;

  constructor(definitions: readonly DungeonDefinition[] = []) {
    for (const definition of definitions) this.registerDefinition(definition);
  }

  registerDefinition(definition: DungeonDefinition): void {
    if (
      definition.id.length === 0
      || definition.keyItemId.length === 0
      || definition.combatProfileId.length === 0
      || definition.lootTableId.length === 0
      || definition.encounters.length === 0
    ) {
      throw new Error("Dungeon definitions require id, keyItemId, combatProfileId, lootTableId and at least one encounter");
    }
    if (definition.encounters.some((encounter) => encounter.monsterDefinitionId.length === 0)) {
      throw new Error(`Dungeon ${definition.id} contains an encounter without monsterDefinitionId`);
    }
    if (definition.encounters.at(-1)?.kind !== "boss") {
      throw new Error(`Dungeon ${definition.id} must end with a boss encounter`);
    }
    if (new Set(definition.encounters.map((encounter) => encounter.id)).size !== definition.encounters.length) {
      throw new Error(`Dungeon ${definition.id} contains duplicate encounter ids`);
    }
    this.#definitions.set(definition.id, definition);
  }

  getDefinition(definitionId: string): DungeonDefinition | undefined {
    return this.#definitions.get(definitionId);
  }

  get activeRun(): DungeonRunState | undefined {
    return this.#activeRun;
  }

  getClearedDefinitionIds(): readonly string[] {
    return [...this.#clearedDefinitionIds];
  }

  getClearedTiers(): readonly number[] {
    return [...new Set(
      [...this.#clearedDefinitionIds]
        .map((definitionId) => this.#definitions.get(definitionId)?.tier)
        .filter((tier): tier is number => tier !== undefined),
    )].sort((a, b) => a - b);
  }

  hasClearedTier(tier: number): boolean {
    return this.getClearedTiers().includes(tier);
  }

  canAccessDefinition(definitionId: string): boolean {
    const definition = this.#definitions.get(definitionId);
    if (definition === undefined) return false;
    return definition.tier <= 4 || this.hasClearedTier(definition.tier - 1);
  }

  restoreClearedDefinitionIds(definitionIds: readonly string[]): void {
    this.#clearedDefinitionIds.clear();
    for (const definitionId of definitionIds) {
      if (this.#definitions.has(definitionId)) this.#clearedDefinitionIds.add(definitionId);
    }
  }

  getActiveEncounter(): DungeonEncounterDefinition | undefined {
    const run = this.#activeRun;
    if (run === undefined || run.status !== "active") return undefined;
    return this.#definitions.get(run.definitionId)?.encounters[run.encounterIndex];
  }

  start(definitionId: string, heroId: EntityId, inventory: InventoryManager): DungeonStartResult {
    if (this.#activeRun?.status === "active") return { ok: false, reason: "run_already_active" };
    const definition = this.#definitions.get(definitionId);
    if (definition === undefined) return { ok: false, reason: "invalid_definition" };
    if (!this.canAccessDefinition(definitionId)) return { ok: false, reason: "progression_locked" };

    const consumed = inventory.removeQuantity(heroId, definition.keyItemId, 1);
    if (!consumed.ok) return { ok: false, reason: "missing_key" };

    const state: DungeonRunState = {
      definitionId,
      status: "active",
      encounterIndex: 0,
      completedEncounterIds: [],
    };
    this.#activeRun = state;
    return { ok: true, state };
  }

  completeEncounter(encounterId: string): DungeonAdvanceResult {
    const run = this.#activeRun;
    const encounter = this.getActiveEncounter();
    if (run === undefined || run.status !== "active" || encounter === undefined) {
      return { ok: false, reason: "no_active_run" };
    }
    if (encounter.id !== encounterId) return { ok: false, reason: "encounter_mismatch" };

    const definition = this.#definitions.get(run.definitionId)!;
    const completedEncounterIds = [...run.completedEncounterIds, encounter.id];
    const cleared = run.encounterIndex === definition.encounters.length - 1;
    const state: DungeonRunState = cleared
      ? { ...run, status: "cleared", completedEncounterIds }
      : { ...run, encounterIndex: run.encounterIndex + 1, completedEncounterIds };
    this.#activeRun = state;
    if (cleared) this.#clearedDefinitionIds.add(run.definitionId);
    return { ok: true, state };
  }

  fail(): DungeonRunState | undefined { return this.#finish("failed"); }
  abandon(): DungeonRunState | undefined { return this.#finish("abandoned"); }

  clearFinishedRun(): void {
    if (this.#activeRun?.status !== "active") this.#activeRun = undefined;
  }

  #finish(status: "failed" | "abandoned"): DungeonRunState | undefined {
    const run = this.#activeRun;
    if (run === undefined || run.status !== "active") return run;
    const state = { ...run, status } as const;
    this.#activeRun = state;
    return state;
  }
}
