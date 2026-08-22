import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import {
  type ExamineRelicResult,
  type RegisterRelicResult,
  type RelicChargeRequirement,
  type RelicDefinition,
  type RelicId,
  type RelicKillEvent,
  type RelicProgressPort,
  type RelicProgressView,
  type RelicSourceDefinition,
} from "./types.js";

const RelicSnapshotV1Schema = z.object({
  version: z.literal(1),
  reconstructedRelicIds: z.array(z.string().min(1)),
});

const RelicSnapshotV2Schema = z.object({
  version: z.literal(2),
  acquiredRelics: z.array(z.object({
    relicId: z.string().min(1),
    acquiredAtFactionKillCount: z.number().int().nonnegative(),
  })),
  examinedRelicIds: z.array(z.string().min(1)),
});

const RelicSnapshotV3Schema = z.object({
  version: z.literal(3),
  acquiredRelics: z.array(z.object({
    relicId: z.string().min(1),
    acquiredAtFactionKillCount: z.number().int().nonnegative(),
  })),
  examinedRelicIds: z.array(z.string().min(1)),
});

const RelicSnapshotV4Schema = z.object({
  version: z.literal(4),
  acquiredRelics: z.array(z.object({
    relicId: z.string().min(1),
    acquiredAtFactionKillCounts: z.array(z.object({
      factionId: z.string().min(1),
      killCount: z.number().int().nonnegative(),
    })),
  })),
  examinedRelicIds: z.array(z.string().min(1)),
});

const RelicSnapshotSchema = z.union([
  RelicSnapshotV1Schema,
  RelicSnapshotV2Schema,
  RelicSnapshotV3Schema,
  RelicSnapshotV4Schema,
]);
type RelicSnapshot = z.infer<typeof RelicSnapshotV4Schema>;

function resolveSource(definition: RelicDefinition): RelicSourceDefinition | undefined {
  if (definition.source !== undefined) return definition.source;
  if (definition.sourceBossMonsterId === undefined) return undefined;
  return { monsterId: definition.sourceBossMonsterId };
}

function resolveChargeRequirements(
  definition: RelicDefinition,
): readonly RelicChargeRequirement[] {
  if (definition.chargeRequirements !== undefined) return definition.chargeRequirements;
  if (definition.factionId === undefined || definition.chargeKillCount === undefined) return [];
  return [{ factionId: definition.factionId, killCount: definition.chargeKillCount }];
}

function normalizeKillEvent(event: string | RelicKillEvent): RelicKillEvent {
  return typeof event === "string" ? { monsterId: event } : event;
}

function sourceMatches(source: RelicSourceDefinition, event: RelicKillEvent): boolean {
  if (source.monsterId !== event.monsterId) return false;
  if (source.contextId !== undefined && source.contextId !== event.contextId) return false;
  if (source.segmentIndex !== undefined && source.segmentIndex !== event.segmentIndex) return false;
  return true;
}

/**
 * Persistent Relic domain.
 *
 * A Relic is acquired once from an authored contextual source, then charged by
 * one or more authored faction-kill objectives performed after acquisition.
 * Examination is an explicit domain transition invoked by the owning Research
 * flow once its analysis Research completes.
 */
export class RelicService implements SaveProvider {
  readonly providerId = "relics";

  readonly #definitions = new Map<RelicId, RelicDefinition>();
  readonly #acquiredAtFactionKillCounts = new Map<RelicId, Map<string, number>>();
  readonly #examinedRelicIds = new Set<RelicId>();
  readonly #progressPort: RelicProgressPort;

  constructor(progressPort: RelicProgressPort) {
    this.#progressPort = progressPort;
  }

  registerRelic(definition: RelicDefinition): RegisterRelicResult {
    if (!this.#isValidDefinition(definition)) return { ok: false, reason: "invalid_definition" };
    if (this.#definitions.has(definition.id)) return { ok: false, reason: "duplicate_relic" };
    this.#definitions.set(definition.id, definition);
    return { ok: true };
  }

  getDefinitions(): readonly RelicDefinition[] {
    return [...this.#definitions.values()];
  }

  getDefinition(relicId: RelicId): RelicDefinition | undefined {
    return this.#definitions.get(relicId);
  }

  /** Compatibility alias retained for existing Achievement readers. */
  isReconstructed(relicId: RelicId): boolean {
    return this.#examinedRelicIds.has(relicId);
  }

  isExamined(relicId: RelicId): boolean {
    return this.#examinedRelicIds.has(relicId);
  }

  getProgress(relicId: RelicId): RelicProgressView | undefined {
    const definition = this.#definitions.get(relicId);
    if (definition === undefined) return undefined;
    const requirements = resolveChargeRequirements(definition);
    const requiredChargeKills = requirements.reduce((total, requirement) => total + requirement.killCount, 0);

    if (this.#examinedRelicIds.has(relicId)) {
      return {
        relicId,
        state: "examined",
        chargeKills: requiredChargeKills,
        requiredChargeKills,
        chargeObjectives: requirements.map((requirement) => ({
          factionId: requirement.factionId,
          chargeKills: requirement.killCount,
          requiredChargeKills: requirement.killCount,
        })),
        reconstructed: true,
      };
    }

    const acquiredAt = this.#acquiredAtFactionKillCounts.get(relicId);
    if (acquiredAt === undefined) {
      return {
        relicId,
        state: "unobtained",
        chargeKills: 0,
        requiredChargeKills,
        chargeObjectives: requirements.map((requirement) => ({
          factionId: requirement.factionId,
          chargeKills: 0,
          requiredChargeKills: requirement.killCount,
        })),
        reconstructed: false,
      };
    }

    const chargeObjectives = requirements.map((requirement) => {
      const baseline = acquiredAt.get(requirement.factionId) ?? 0;
      const currentFactionKills = this.#progressPort.getFactionKillCount(requirement.factionId);
      return {
        factionId: requirement.factionId,
        chargeKills: Math.min(requirement.killCount, Math.max(0, currentFactionKills - baseline)),
        requiredChargeKills: requirement.killCount,
      };
    });
    const chargeKills = chargeObjectives.reduce((total, objective) => total + objective.chargeKills, 0);
    const charged = chargeObjectives.every((objective) => (
      objective.chargeKills >= objective.requiredChargeKills
    ));

    return {
      relicId,
      state: charged ? "charged" : "broken",
      chargeKills,
      requiredChargeKills,
      chargeObjectives,
      reconstructed: false,
    };
  }

  /**
   * Called after the authoritative faction-knowledge kill counter has advanced.
   * Acquisition is committed only if the external owner accepts the unique
   * inventory object.
   */
  recordMonsterKill(
    kill: string | RelicKillEvent,
    tryAcquire: (definition: RelicDefinition) => boolean = () => true,
  ): readonly RelicId[] {
    const event = normalizeKillEvent(kill);
    const newlyAcquired: RelicId[] = [];
    for (const definition of this.#definitions.values()) {
      const source = resolveSource(definition);
      if (source === undefined || !sourceMatches(source, event)) continue;
      if (this.#examinedRelicIds.has(definition.id)) continue;
      if (this.#acquiredAtFactionKillCounts.has(definition.id)) continue;
      if (!tryAcquire(definition)) continue;

      const baselines = new Map<string, number>();
      for (const requirement of resolveChargeRequirements(definition)) {
        baselines.set(
          requirement.factionId,
          this.#progressPort.getFactionKillCount(requirement.factionId),
        );
      }
      this.#acquiredAtFactionKillCounts.set(definition.id, baselines);
      newlyAcquired.push(definition.id);
    }
    return newlyAcquired;
  }

  examineRelic(relicId: RelicId): ExamineRelicResult {
    const definition = this.#definitions.get(relicId);
    if (definition === undefined) return { ok: false, reason: "unknown_relic" };
    if (this.#examinedRelicIds.has(relicId)) return { ok: false, reason: "already_examined" };

    const progress = this.getProgress(relicId);
    if (progress?.state === "unobtained") return { ok: false, reason: "not_acquired" };
    if (progress?.state !== "charged") return { ok: false, reason: "not_charged" };

    this.#examinedRelicIds.add(relicId);
    return { ok: true };
  }

  save(): RelicSnapshot {
    return {
      version: 4,
      acquiredRelics: [...this.#acquiredAtFactionKillCounts].map(([relicId, baselines]) => ({
        relicId,
        acquiredAtFactionKillCounts: [...baselines].map(([factionId, killCount]) => ({
          factionId,
          killCount,
        })),
      })),
      examinedRelicIds: [...this.#examinedRelicIds],
    };
  }

  load(data: unknown): void {
    const parsed = RelicSnapshotSchema.safeParse(data);
    if (!parsed.success) return;

    this.#acquiredAtFactionKillCounts.clear();
    this.#examinedRelicIds.clear();

    if (parsed.data.version === 4) {
      for (const entry of parsed.data.acquiredRelics) {
        const definition = this.#definitions.get(entry.relicId);
        if (definition === undefined) continue;
        const allowedFactions = new Set(resolveChargeRequirements(definition).map(({ factionId }) => factionId));
        const baselines = new Map<string, number>();
        for (const baseline of entry.acquiredAtFactionKillCounts) {
          if (!allowedFactions.has(baseline.factionId)) continue;
          baselines.set(baseline.factionId, baseline.killCount);
        }
        for (const requirement of resolveChargeRequirements(definition)) {
          if (!baselines.has(requirement.factionId)) {
            baselines.set(
              requirement.factionId,
              this.#progressPort.getFactionKillCount(requirement.factionId),
            );
          }
        }
        this.#acquiredAtFactionKillCounts.set(entry.relicId, baselines);
      }
      for (const relicId of new Set(parsed.data.examinedRelicIds)) {
        if (!this.#definitions.has(relicId)) continue;
        this.#examinedRelicIds.add(relicId);
      }
      return;
    }

    // V1-V3 belonged to the previous one-Relic-per-faction model. Only IDs
    // still authored by the current content may migrate; newly consolidated
    // Relics deliberately start from their new authored acquisition source.
    const legacyRelicIds = parsed.data.version === 1
      ? parsed.data.reconstructedRelicIds
      : [
        ...parsed.data.acquiredRelics.map((entry) => entry.relicId),
        ...parsed.data.examinedRelicIds,
      ];

    for (const relicId of new Set(legacyRelicIds)) {
      const definition = this.#definitions.get(relicId);
      if (definition === undefined) continue;
      const baselines = new Map<string, number>();
      for (const requirement of resolveChargeRequirements(definition)) {
        baselines.set(
          requirement.factionId,
          this.#progressPort.getFactionKillCount(requirement.factionId),
        );
      }
      this.#acquiredAtFactionKillCounts.set(relicId, baselines);
    }
  }

  #isValidDefinition(definition: RelicDefinition): boolean {
    const source = resolveSource(definition);
    const requirements = resolveChargeRequirements(definition);
    const factions = requirements.map(({ factionId }) => factionId);
    return definition.id.trim() !== ""
      && definition.inventoryItemId.trim() !== ""
      && source !== undefined
      && source.monsterId.trim() !== ""
      && (source.contextId === undefined || source.contextId.trim() !== "")
      && (source.segmentIndex === undefined || (Number.isInteger(source.segmentIndex) && source.segmentIndex >= 0))
      && requirements.length > 0
      && new Set(factions).size === factions.length
      && requirements.every((requirement) => (
        requirement.factionId.trim() !== ""
        && Number.isInteger(requirement.killCount)
        && requirement.killCount > 0
      ));
  }
}
