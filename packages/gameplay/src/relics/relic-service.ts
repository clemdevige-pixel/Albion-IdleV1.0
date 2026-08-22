import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import {
  type ExamineRelicResult,
  type RegisterRelicResult,
  type RelicDefinition,
  type RelicId,
  type RelicProgressPort,
  type RelicProgressView,
  type RelicReconstructionPort,
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

const RelicSnapshotSchema = z.union([RelicSnapshotV1Schema, RelicSnapshotV2Schema]);
type RelicSnapshot = z.infer<typeof RelicSnapshotV2Schema>;

const DEFAULT_RECONSTRUCTION_PORT: RelicReconstructionPort = {
  canReconstructRelic: () => true,
};

/**
 * Persistent faction Relic domain.
 *
 * A Relic is dropped once by its authored faction boss, then charged by faction
 * kills performed after acquisition. Once charged, the Academy may examine it
 * when the owning Research authority allows examination. No fragment items or
 * duplicate objective counters are stored.
 */
export class RelicService implements SaveProvider {
  readonly providerId = "relics";

  readonly #definitions = new Map<RelicId, RelicDefinition>();
  readonly #acquiredAtFactionKillCount = new Map<RelicId, number>();
  readonly #examinedRelicIds = new Set<RelicId>();
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

  getDefinitions(): readonly RelicDefinition[] {
    return [...this.#definitions.values()];
  }

  getDefinition(relicId: RelicId): RelicDefinition | undefined {
    return this.#definitions.get(relicId);
  }

  /** Compatibility alias: an examined Relic fulfills old reconstructed gates. */
  isReconstructed(relicId: RelicId): boolean {
    return this.#examinedRelicIds.has(relicId);
  }

  isExamined(relicId: RelicId): boolean {
    return this.#examinedRelicIds.has(relicId);
  }

  getProgress(relicId: RelicId): RelicProgressView | undefined {
    const definition = this.#definitions.get(relicId);
    if (definition === undefined) return undefined;

    if (this.#examinedRelicIds.has(relicId)) {
      return {
        relicId,
        state: "examined",
        chargeKills: definition.chargeKillCount,
        requiredChargeKills: definition.chargeKillCount,
        reconstructed: true,
      };
    }

    const acquiredAt = this.#acquiredAtFactionKillCount.get(relicId);
    if (acquiredAt === undefined) {
      return {
        relicId,
        state: "unobtained",
        chargeKills: 0,
        requiredChargeKills: definition.chargeKillCount,
        reconstructed: false,
      };
    }

    const currentFactionKills = this.#progressPort.getFactionKillCount(definition.factionId);
    const chargeKills = Math.min(
      definition.chargeKillCount,
      Math.max(0, currentFactionKills - acquiredAt),
    );

    return {
      relicId,
      state: chargeKills >= definition.chargeKillCount ? "charged" : "broken",
      chargeKills,
      requiredChargeKills: definition.chargeKillCount,
      reconstructed: false,
    };
  }

  /**
   * Called after the authoritative faction-knowledge kill counter has advanced.
   * The matching boss drops its Relic exactly once. Its own kill is used as the
   * baseline, so charging starts at 0/required and only later faction kills count.
   */
  recordMonsterKill(monsterId: string): readonly RelicId[] {
    const newlyAcquired: RelicId[] = [];
    for (const definition of this.#definitions.values()) {
      if (definition.sourceBossMonsterId !== monsterId) continue;
      if (this.#examinedRelicIds.has(definition.id)) continue;
      if (this.#acquiredAtFactionKillCount.has(definition.id)) continue;

      this.#acquiredAtFactionKillCount.set(
        definition.id,
        this.#progressPort.getFactionKillCount(definition.factionId),
      );
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
    if (!this.#reconstructionPort.canReconstructRelic(definition)) {
      return { ok: false, reason: "examination_locked" };
    }

    this.#examinedRelicIds.add(relicId);
    return { ok: true };
  }

  save(): RelicSnapshot {
    return {
      version: 2,
      acquiredRelics: [...this.#acquiredAtFactionKillCount].map(([
        relicId,
        acquiredAtFactionKillCount,
      ]) => ({ relicId, acquiredAtFactionKillCount })),
      examinedRelicIds: [...this.#examinedRelicIds],
    };
  }

  load(data: unknown): void {
    const parsed = RelicSnapshotSchema.safeParse(data);
    if (!parsed.success) return;

    this.#acquiredAtFactionKillCount.clear();
    this.#examinedRelicIds.clear();

    if (parsed.data.version === 1) {
      for (const relicId of new Set(parsed.data.reconstructedRelicIds)) {
        if (!this.#definitions.has(relicId)) continue;
        this.#acquiredAtFactionKillCount.set(relicId, 0);
        this.#examinedRelicIds.add(relicId);
      }
      return;
    }

    for (const entry of parsed.data.acquiredRelics) {
      if (!this.#definitions.has(entry.relicId)) continue;
      this.#acquiredAtFactionKillCount.set(entry.relicId, entry.acquiredAtFactionKillCount);
    }
    for (const relicId of new Set(parsed.data.examinedRelicIds)) {
      if (!this.#definitions.has(relicId)) continue;
      this.#examinedRelicIds.add(relicId);
    }
  }

  #isValidDefinition(definition: RelicDefinition): boolean {
    return definition.id.trim() !== ""
      && definition.factionId.trim() !== ""
      && definition.sourceBossMonsterId.trim() !== ""
      && Number.isInteger(definition.chargeKillCount)
      && definition.chargeKillCount > 0;
  }
}
