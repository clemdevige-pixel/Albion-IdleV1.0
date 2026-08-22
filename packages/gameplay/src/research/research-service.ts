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

const ResearchSnapshotSchema = z.object({
  version: z.literal(1),
  completedResearchIds: z.array(z.string().min(1)),
  activeResearch: z.object({
    researchId: z.string().min(1),
    remainingDurationMs: z.number().finite().positive(),
  }).nullable(),
});

type ResearchSnapshot = z.infer<typeof ResearchSnapshotSchema>;
type ResearchCompletionListener = (researchId: ResearchId) => void;

export interface ResearchServiceDependencies<
  TRequirement extends ResearchRequirementDefinition,
> {
  readonly requirementPort: ResearchRequirementPort<TRequirement>;
  readonly paymentPort: ResearchPaymentPort;
}

/**
 * Authoritative Academy Research state.
 *
 * Research definitions are data-driven and registered once. The service owns
 * only the active timer and permanent completion state. Functional unlocks are
 * derived from completed definitions instead of being duplicated in save data.
 *
 * Time never comes from the client clock: callers provide elapsed time from the
 * authoritative runtime/background-progression layer.
 */
export class ResearchService<
  TRequirement extends ResearchRequirementDefinition = ResearchRequirementDefinition,
> implements SaveProvider {
  readonly providerId = "research";

  readonly #definitions = new Map<ResearchId, ResearchDefinition<TRequirement>>();
  readonly #completedResearchIds = new Set<ResearchId>();
  readonly #requirementPort: ResearchRequirementPort<TRequirement>;
  readonly #paymentPort: ResearchPaymentPort;
  readonly #completionListeners = new Set<ResearchCompletionListener>();
  #activeResearch: ActiveResearchState | undefined;

  constructor(dependencies: ResearchServiceDependencies<TRequirement>) {
    this.#requirementPort = dependencies.requirementPort;
    this.#paymentPort = dependencies.paymentPort;
  }

  registerResearch(definition: ResearchDefinition<TRequirement>): RegisterResearchResult {
    if (!this.#isValidDefinition(definition)) {
      return { ok: false, reason: "invalid_definition" };
    }
    if (this.#definitions.has(definition.id)) {
      return { ok: false, reason: "duplicate_research" };
    }
    this.#definitions.set(definition.id, definition);
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

  getActiveResearch(): ActiveResearchState | undefined {
    return this.#activeResearch === undefined ? undefined : { ...this.#activeResearch };
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
    if (this.#activeResearch?.researchId === researchId) return "active";
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
    if (this.#activeResearch !== undefined) {
      return { ok: false, reason: "research_slot_occupied" };
    }
    if (!this.#areRequirementsMet(definition)) {
      return { ok: false, reason: "requirements_not_met" };
    }
    if (!this.#paymentPort.tryConsumeResearchCost(definition.cost)) {
      return { ok: false, reason: "payment_failed" };
    }

    this.#activeResearch = {
      researchId: definition.id,
      remainingDurationMs: definition.durationMs,
    };
    return { ok: true, activeResearch: { ...this.#activeResearch } };
  }

  advance(elapsedMs: number): ResearchAdvanceResult {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new Error("Research elapsed time must be a finite non-negative number");
    }
    if (this.#activeResearch === undefined || elapsedMs === 0) {
      return {
        completedResearchId: undefined,
        activeResearch: this.getActiveResearch(),
      };
    }

    if (elapsedMs < this.#activeResearch.remainingDurationMs) {
      this.#activeResearch = {
        ...this.#activeResearch,
        remainingDurationMs: this.#activeResearch.remainingDurationMs - elapsedMs,
      };
      return {
        completedResearchId: undefined,
        activeResearch: this.getActiveResearch(),
      };
    }

    const completedResearchId = this.#activeResearch.researchId;
    this.#completedResearchIds.add(completedResearchId);
    this.#activeResearch = undefined;
    for (const listener of this.#completionListeners) listener(completedResearchId);
    return { completedResearchId, activeResearch: undefined };
  }

  resolveBackground(elapsedMs: number): void {
    this.advance(elapsedMs);
  }

  save(): ResearchSnapshot {
    return {
      version: 1,
      completedResearchIds: [...this.getCompletedResearchIds()],
      activeResearch: this.#activeResearch === undefined ? null : { ...this.#activeResearch },
    };
  }

  load(data: unknown): void {
    const parsed = ResearchSnapshotSchema.safeParse(data);
    if (!parsed.success) return;

    this.#completedResearchIds.clear();
    for (const researchId of new Set(parsed.data.completedResearchIds)) {
      if (this.#definitions.has(researchId)) this.#completedResearchIds.add(researchId);
    }

    const active = parsed.data.activeResearch;
    if (
      active === null
      || !this.#definitions.has(active.researchId)
      || this.#completedResearchIds.has(active.researchId)
    ) {
      this.#activeResearch = undefined;
      return;
    }

    this.#activeResearch = {
      researchId: active.researchId,
      remainingDurationMs: active.remainingDurationMs,
    };
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
    if (definition.unlockIds.length === 0) return false;
    if (definition.unlockIds.some((unlockId) => unlockId.trim() === "")) return false;
    if (new Set(definition.unlockIds).size !== definition.unlockIds.length) return false;
    return true;
  }
}
