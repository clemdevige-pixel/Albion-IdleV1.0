import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import type {
  ActiveResearchState,
  RegisterResearchResult,
  ResearchAdvanceResult,
  ResearchDefinition,
  ResearchEntryState,
  ResearchId,
  ResearchPaymentPort,
  ResearchRequirementDefinition,
  ResearchRequirementPort,
  ResearchUnlockId,
  StartResearchResult,
} from "./types.js";

const ActiveResearchSchema = z.object({
  researchId: z.string().min(1),
  remainingDurationMs: z.number().finite().positive(),
});

const ResearchSnapshotV1Schema = z.object({
  version: z.literal(1),
  completedResearchIds: z.array(z.string().min(1)),
  activeResearch: ActiveResearchSchema.nullable(),
});

const ResearchSnapshotV2Schema = z.object({
  version: z.literal(2),
  completedResearchIds: z.array(z.string().min(1)),
  activeResearches: z.array(ActiveResearchSchema),
});

const ResearchSnapshotSchema = z.union([ResearchSnapshotV2Schema, ResearchSnapshotV1Schema]);

type ResearchSnapshot = z.infer<typeof ResearchSnapshotV2Schema>;
type ResearchCompletionListener = (researchId: ResearchId) => void;

export interface ResearchServiceDependencies<
  TRequirement extends ResearchRequirementDefinition,
> {
  readonly requirementPort: ResearchRequirementPort<TRequirement>;
  readonly paymentPort: ResearchPaymentPort<TRequirement>;
}

/**
 * Authoritative Academy Research state.
 *
 * Research definitions are data-driven and registered once. Independent
 * researches may run simultaneously; the service owns their timers and the
 * permanent completion set. Functional unlocks are derived from completed
 * definitions instead of being duplicated in save data.
 *
 * Time never comes from the client clock: callers provide elapsed time from the
 * authoritative runtime/background-progression layer.
 */
export class ResearchService<
  TRequirement extends ResearchRequirementDefinition = ResearchRequirementDefinition,
> implements SaveProvider {
  readonly providerId = "research";

  readonly #definitions = new Map<ResearchId, ResearchDefinition<TRequirement>>();
  readonly #legacyIdTargets = new Map<ResearchId, ResearchId>();
  readonly #completedResearchIds = new Set<ResearchId>();
  readonly #activeResearches = new Map<ResearchId, ActiveResearchState>();
  readonly #requirementPort: ResearchRequirementPort<TRequirement>;
  readonly #paymentPort: ResearchPaymentPort<TRequirement>;
  readonly #completionListeners = new Set<ResearchCompletionListener>();

  constructor(dependencies: ResearchServiceDependencies<TRequirement>) {
    this.#requirementPort = dependencies.requirementPort;
    this.#paymentPort = dependencies.paymentPort;
  }

  registerResearch(definition: ResearchDefinition<TRequirement>): RegisterResearchResult {
    if (!this.#isValidDefinition(definition)) {
      return { ok: false, reason: "invalid_definition" };
    }
    if (this.#definitions.has(definition.id) || this.#legacyIdTargets.has(definition.id)) {
      return { ok: false, reason: "duplicate_research" };
    }
    for (const legacyId of definition.legacyIds ?? []) {
      if (this.#definitions.has(legacyId) || this.#legacyIdTargets.has(legacyId)) {
        return { ok: false, reason: "duplicate_research" };
      }
    }
    this.#definitions.set(definition.id, definition);
    for (const legacyId of definition.legacyIds ?? []) {
      this.#legacyIdTargets.set(legacyId, definition.id);
    }
    return { ok: true };
  }

  getDefinition(researchId: ResearchId): ResearchDefinition<TRequirement> | undefined {
    return this.#definitions.get(researchId);
  }

  getDefinitions(): readonly ResearchDefinition<TRequirement>[] {
    return [...this.#definitions.values()];
  }

  getCompletedResearchIds(): readonly ResearchId[] {
    return [...this.#completedResearchIds];
  }

  getActiveResearches(): readonly ActiveResearchState[] {
    return [...this.#activeResearches.values()].map((entry) => ({ ...entry }));
  }

  /** Compatibility read for callers that only need to know whether anything is active. */
  getActiveResearch(): ActiveResearchState | undefined {
    const first = this.#activeResearches.values().next().value;
    return first === undefined ? undefined : { ...first };
  }

  hasCompleted(researchId: ResearchId): boolean {
    return this.#completedResearchIds.has(researchId);
  }

  hasUnlock(unlockId: ResearchUnlockId): boolean {
    for (const researchId of this.#completedResearchIds) {
      const definition = this.#definitions.get(researchId);
      if (definition?.unlockIds.includes(unlockId) === true) return true;
    }
    return false;
  }

  getEntryState(researchId: ResearchId): ResearchEntryState | undefined {
    const definition = this.#definitions.get(researchId);
    if (definition === undefined) return undefined;
    if (this.#completedResearchIds.has(researchId)) return "completed";
    if (this.#activeResearches.has(researchId)) return "active";
    return this.#areRequirementsMet(definition) ? "available" : "locked";
  }

  onCompleted(listener: ResearchCompletionListener): () => void {
    this.#completionListeners.add(listener);
    return () => { this.#completionListeners.delete(listener); };
  }

  startResearch(researchId: ResearchId): StartResearchResult {
    const definition = this.#definitions.get(researchId);
    if (definition === undefined) return { ok: false, reason: "research_not_found" };
    if (this.#completedResearchIds.has(researchId)) {
      return { ok: false, reason: "already_completed" };
    }
    if (this.#activeResearches.has(researchId)) {
      return { ok: false, reason: "already_active" };
    }
    if (!this.#areRequirementsMet(definition)) {
      return { ok: false, reason: "requirements_not_met" };
    }
    if (!this.#paymentPort.tryConsumeResearchCost(definition.cost, definition)) {
      return { ok: false, reason: "payment_failed" };
    }

    const activeResearch: ActiveResearchState = {
      researchId: definition.id,
      remainingDurationMs: definition.durationMs,
    };
    this.#activeResearches.set(definition.id, activeResearch);
    return { ok: true, activeResearch: { ...activeResearch } };
  }

  advance(elapsedMs: number): ResearchAdvanceResult {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new Error("Research elapsed time must be a finite non-negative number");
    }
    if (this.#activeResearches.size === 0 || elapsedMs === 0) {
      return {
        completedResearchIds: [],
        activeResearches: this.getActiveResearches(),
      };
    }

    const completedResearchIds: ResearchId[] = [];
    for (const [researchId, activeResearch] of [...this.#activeResearches.entries()]) {
      if (elapsedMs < activeResearch.remainingDurationMs) {
        this.#activeResearches.set(researchId, {
          ...activeResearch,
          remainingDurationMs: activeResearch.remainingDurationMs - elapsedMs,
        });
        continue;
      }

      this.#activeResearches.delete(researchId);
      this.#completedResearchIds.add(researchId);
      completedResearchIds.push(researchId);
      for (const listener of this.#completionListeners) listener(researchId);
    }

    return {
      completedResearchIds,
      activeResearches: this.getActiveResearches(),
    };
  }

  resolveBackground(elapsedMs: number): void {
    this.advance(elapsedMs);
  }

  save(): ResearchSnapshot {
    return {
      version: 2,
      completedResearchIds: [...this.getCompletedResearchIds()],
      activeResearches: [...this.getActiveResearches()],
    };
  }

  load(data: unknown): void {
    const parsed = ResearchSnapshotSchema.safeParse(data);
    if (!parsed.success) return;

    this.#completedResearchIds.clear();
    this.#activeResearches.clear();
    for (const savedResearchId of new Set(parsed.data.completedResearchIds)) {
      const researchId = this.#resolveSavedResearchId(savedResearchId);
      if (researchId !== undefined) this.#completedResearchIds.add(researchId);
    }

    const activeResearches = parsed.data.version === 1
      ? (parsed.data.activeResearch === null ? [] : [parsed.data.activeResearch])
      : parsed.data.activeResearches;

    for (const active of activeResearches) {
      const researchId = this.#resolveSavedResearchId(active.researchId);
      if (
        researchId === undefined
        || this.#completedResearchIds.has(researchId)
        || this.#activeResearches.has(researchId)
      ) continue;
      this.#activeResearches.set(researchId, { ...active, researchId });
    }
  }

  #resolveSavedResearchId(researchId: ResearchId): ResearchId | undefined {
    if (this.#definitions.has(researchId)) return researchId;
    return this.#legacyIdTargets.get(researchId);
  }

  #areRequirementsMet(definition: ResearchDefinition<TRequirement>): boolean {
    return definition.requirements.every((requirement) => (
      this.#requirementPort.isRequirementMet(requirement, definition)
    ));
  }

  #isValidDefinition(definition: ResearchDefinition<TRequirement>): boolean {
    if (definition.id.trim() === "" || definition.displayName.trim() === "") return false;
    if (!Number.isInteger(definition.tier) || definition.tier < 4 || definition.tier > 8) return false;
    if (!Number.isFinite(definition.durationMs) || definition.durationMs <= 0) return false;
    if (!Number.isInteger(definition.cost.silver) || definition.cost.silver < 0) return false;
    if (
      definition.cost.materials.some((material) => (
        material.itemId.trim() === ""
        || !Number.isInteger(material.quantity)
        || material.quantity <= 0
      ))
    ) return false;
    if (definition.requirements.some((requirement) => requirement.type.trim() === "")) return false;
    if (definition.unlockIds.some((unlockId) => unlockId.trim() === "")) return false;
    if (new Set(definition.unlockIds).size !== definition.unlockIds.length) return false;
    if (
      definition.legacyIds?.some((legacyId) => legacyId.trim() === "" || legacyId === definition.id) === true
    ) return false;
    if (definition.legacyIds !== undefined && new Set(definition.legacyIds).size !== definition.legacyIds.length) {
      return false;
    }
    return true;
  }
}
