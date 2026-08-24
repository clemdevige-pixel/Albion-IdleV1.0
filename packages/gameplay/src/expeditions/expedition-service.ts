import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import {
  EXPEDITION_DURATION_OPTIONS_MS,
  type ActiveExpeditionState,
  type CancelExpeditionResult,
  type ExpeditionAdvanceResult,
  type ExpeditionCompletion,
  type ExpeditionDefinition,
  type ExpeditionDurationMs,
  type ExpeditionId,
  type ExpeditionRequirementDefinition,
  type ExpeditionRequirementPort,
  type ExpeditionRewardPort,
  type ExpeditionSlotCapacityPort,
  type ExpeditionStartState,
  type RegisterExpeditionResult,
  type StartExpeditionResult,
} from "./types.js";

const ActiveExpeditionSnapshotSchema = z.object({
  slotIndex: z.number().int().nonnegative(),
  expeditionId: z.string().min(1),
  typeId: z.string().min(1),
  durationMs: z.number().int().positive(),
  remainingDurationMs: z.number().finite().positive(),
});

const ExpeditionSnapshotV1Schema = z.object({
  version: z.literal(1),
  activeExpeditions: z.array(ActiveExpeditionSnapshotSchema),
});

const ExpeditionSnapshotV2Schema = z.object({
  version: z.literal(2),
  activeExpeditions: z.array(ActiveExpeditionSnapshotSchema),
  completedByType: z.record(z.string().min(1), z.number().int().nonnegative()),
});

const ExpeditionSnapshotSchema = z.union([
  ExpeditionSnapshotV1Schema,
  ExpeditionSnapshotV2Schema,
]);

type ExpeditionSnapshot = z.infer<typeof ExpeditionSnapshotV2Schema>;
type ExpeditionCompletionListener<TRewardSummary> = (
  completed: readonly ExpeditionCompletion<TRewardSummary>[],
) => void;

export interface ExpeditionServiceDependencies<
  TRequirement extends ExpeditionRequirementDefinition,
  TRewardSummary,
> {
  readonly requirementPort: ExpeditionRequirementPort<TRequirement>;
  readonly slotCapacityPort: ExpeditionSlotCapacityPort;
  readonly rewardPort: ExpeditionRewardPort<TRequirement, TRewardSummary>;
}

/**
 * Authoritative passive Expedition runtime.
 *
 * Definitions are data-driven. The service owns active slots/timers and its
 * lifetime completion counts; economy and Faction Mastery effects remain
 * delegated to the reward port. Callers provide authoritative elapsed time for
 * both online and offline progression, so no local clock is consulted here.
 */
export class ExpeditionService<
  TRequirement extends ExpeditionRequirementDefinition = ExpeditionRequirementDefinition,
  TRewardSummary = unknown,
> implements SaveProvider {
  readonly providerId = "expeditions";

  readonly #definitions = new Map<ExpeditionId, ExpeditionDefinition<TRequirement>>();
  readonly #requirementPort: ExpeditionRequirementPort<TRequirement>;
  readonly #slotCapacityPort: ExpeditionSlotCapacityPort;
  readonly #rewardPort: ExpeditionRewardPort<TRequirement, TRewardSummary>;
  readonly #completionListeners = new Set<ExpeditionCompletionListener<TRewardSummary>>();
  #activeExpeditions: ActiveExpeditionState[] = [];
  #completedByType = new Map<string, number>();

  constructor(dependencies: ExpeditionServiceDependencies<TRequirement, TRewardSummary>) {
    this.#requirementPort = dependencies.requirementPort;
    this.#slotCapacityPort = dependencies.slotCapacityPort;
    this.#rewardPort = dependencies.rewardPort;
  }

  registerExpedition(
    definition: ExpeditionDefinition<TRequirement>,
  ): RegisterExpeditionResult {
    if (!this.#isValidDefinition(definition)) {
      return { ok: false, reason: "invalid_definition" };
    }
    if (this.#definitions.has(definition.id)) {
      return { ok: false, reason: "duplicate_expedition" };
    }
    this.#definitions.set(definition.id, definition);
    return { ok: true };
  }

  getDefinition(
    expeditionId: ExpeditionId,
  ): ExpeditionDefinition<TRequirement> | undefined {
    return this.#definitions.get(expeditionId);
  }

  getDefinitions(): readonly ExpeditionDefinition<TRequirement>[] {
    return [...this.#definitions.values()];
  }

  getActiveExpeditions(): readonly ActiveExpeditionState[] {
    return this.#activeExpeditions
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((entry) => ({ ...entry }));
  }

  getSlotCapacity(): number {
    return this.#getValidatedSlotCapacity();
  }

  getStartState(expeditionId: ExpeditionId): ExpeditionStartState | undefined {
    const definition = this.#definitions.get(expeditionId);
    if (definition === undefined) return undefined;
    if (!this.#areRequirementsMet(definition)) return "requirements_locked";
    if (this.#activeExpeditions.some((entry) => entry.typeId === definition.typeId)) {
      return "type_active";
    }
    if (this.#findAvailableSlot(this.#getValidatedSlotCapacity()) === undefined) {
      return "no_available_slot";
    }
    return "available";
  }

  getCompletedCount(typeId: string): number {
    return this.#completedByType.get(typeId) ?? 0;
  }

  getTotalCompletedCount(): number {
    let total = 0;
    for (const count of this.#completedByType.values()) total += count;
    return total;
  }

  onCompleted(listener: ExpeditionCompletionListener<TRewardSummary>): () => void {
    this.#completionListeners.add(listener);
    return () => { this.#completionListeners.delete(listener); };
  }

  startExpedition(
    expeditionId: ExpeditionId,
    durationMs: ExpeditionDurationMs,
  ): StartExpeditionResult {
    const definition = this.#definitions.get(expeditionId);
    if (definition === undefined) return { ok: false, reason: "expedition_not_found" };
    if (!this.#isSupportedDuration(definition, durationMs)) {
      return { ok: false, reason: "invalid_duration" };
    }
    if (!this.#areRequirementsMet(definition)) {
      return { ok: false, reason: "requirements_not_met" };
    }
    if (this.#activeExpeditions.some((entry) => entry.typeId === definition.typeId)) {
      return { ok: false, reason: "type_already_active" };
    }

    const capacity = this.#getValidatedSlotCapacity();
    const slotIndex = this.#findAvailableSlot(capacity);
    if (slotIndex === undefined) return { ok: false, reason: "no_available_slot" };

    const activeExpedition: ActiveExpeditionState = {
      slotIndex,
      expeditionId: definition.id,
      typeId: definition.typeId,
      durationMs,
      remainingDurationMs: durationMs,
    };
    this.#activeExpeditions = [...this.#activeExpeditions, activeExpedition];
    return { ok: true, activeExpedition: { ...activeExpedition } };
  }

  cancelExpedition(slotIndex: number): CancelExpeditionResult {
    const cancelled = this.#activeExpeditions.find((entry) => entry.slotIndex === slotIndex);
    if (cancelled === undefined) {
      return { ok: false, reason: "active_expedition_not_found" };
    }

    this.#activeExpeditions = this.#activeExpeditions.filter(
      (entry) => entry.slotIndex !== slotIndex,
    );
    return { ok: true, cancelledExpedition: { ...cancelled } };
  }

  advance(elapsedMs: number): ExpeditionAdvanceResult<TRewardSummary> {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new Error("Expedition elapsed time must be a finite non-negative number");
    }
    if (elapsedMs === 0 || this.#activeExpeditions.length === 0) {
      return { completed: [], activeExpeditions: this.getActiveExpeditions() };
    }

    const remaining: ActiveExpeditionState[] = [];
    const completed: ExpeditionCompletion<TRewardSummary>[] = [];

    for (const active of this.#activeExpeditions) {
      if (elapsedMs < active.remainingDurationMs) {
        remaining.push({
          ...active,
          remainingDurationMs: active.remainingDurationMs - elapsedMs,
        });
        continue;
      }

      const definition = this.#definitions.get(active.expeditionId);
      if (definition === undefined) continue;
      const rewardSummary = this.#rewardPort.grantCompletionReward(
        definition,
        active.durationMs,
      );
      this.#completedByType.set(
        active.typeId,
        this.getCompletedCount(active.typeId) + 1,
      );
      completed.push({
        slotIndex: active.slotIndex,
        expeditionId: active.expeditionId,
        typeId: active.typeId,
        durationMs: active.durationMs,
        rewardSummary,
      });
    }

    this.#activeExpeditions = remaining;
    if (completed.length > 0) {
      for (const listener of this.#completionListeners) listener(completed);
    }
    return { completed, activeExpeditions: this.getActiveExpeditions() };
  }

  resolveBackground(elapsedMs: number): void {
    this.advance(elapsedMs);
  }

  save(): ExpeditionSnapshot {
    return {
      version: 2,
      activeExpeditions: [...this.getActiveExpeditions()],
      completedByType: Object.fromEntries(this.#completedByType),
    };
  }

  load(data: unknown): void {
    const parsed = ExpeditionSnapshotSchema.safeParse(data);
    if (!parsed.success) return;

    const capacity = this.#getValidatedSlotCapacity();
    const restored: ActiveExpeditionState[] = [];
    const occupiedSlots = new Set<number>();
    const activeTypes = new Set<string>();

    for (const active of parsed.data.activeExpeditions) {
      const definition = this.#definitions.get(active.expeditionId);
      if (definition === undefined) continue;
      if (definition.typeId !== active.typeId) continue;
      if (!this.#isSupportedDuration(definition, active.durationMs)) continue;
      if (active.slotIndex >= capacity || occupiedSlots.has(active.slotIndex)) continue;
      if (activeTypes.has(active.typeId)) continue;

      occupiedSlots.add(active.slotIndex);
      activeTypes.add(active.typeId);
      restored.push({
        slotIndex: active.slotIndex,
        expeditionId: active.expeditionId,
        typeId: active.typeId,
        durationMs: active.durationMs,
        remainingDurationMs: active.remainingDurationMs,
      });
    }

    this.#activeExpeditions = restored;
    this.#completedByType.clear();
    if (parsed.data.version === 2) {
      for (const [typeId, count] of Object.entries(parsed.data.completedByType)) {
        if (count > 0) this.#completedByType.set(typeId, count);
      }
    }
  }

  #areRequirementsMet(definition: ExpeditionDefinition<TRequirement>): boolean {
    return definition.requirements.every((requirement) => (
      this.#requirementPort.isRequirementMet(requirement, definition)
    ));
  }

  #findAvailableSlot(capacity: number): number | undefined {
    const occupied = new Set(this.#activeExpeditions.map((entry) => entry.slotIndex));
    for (let slotIndex = 0; slotIndex < capacity; slotIndex += 1) {
      if (!occupied.has(slotIndex)) return slotIndex;
    }
    return undefined;
  }

  #getValidatedSlotCapacity(): number {
    const capacity = this.#slotCapacityPort.getSlotCapacity();
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new Error("Expedition slot capacity must be a non-negative integer");
    }
    return capacity;
  }

  #isSupportedDuration(
    definition: ExpeditionDefinition<TRequirement>,
    durationMs: number,
  ): durationMs is ExpeditionDurationMs {
    const durations = definition.supportedDurationsMs ?? EXPEDITION_DURATION_OPTIONS_MS;
    return durations.some((duration) => duration === durationMs);
  }

  #isValidDefinition(definition: ExpeditionDefinition<TRequirement>): boolean {
    if (
      definition.id.trim() === ""
      || definition.typeId.trim() === ""
      || definition.displayName.trim() === ""
    ) return false;
    if (!Number.isInteger(definition.tier) || definition.tier < 4 || definition.tier > 8) {
      return false;
    }
    if (definition.requirements.some((requirement) => requirement.type.trim() === "")) {
      return false;
    }
    const durations = definition.supportedDurationsMs ?? EXPEDITION_DURATION_OPTIONS_MS;
    if (durations.length === 0) return false;
    if (new Set(durations).size !== durations.length) return false;
    return durations.every((duration) => (
      EXPEDITION_DURATION_OPTIONS_MS.includes(duration)
    ));
  }
}