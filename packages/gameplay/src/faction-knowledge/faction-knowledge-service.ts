import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import type {
  FactionId,
  FactionKnowledgeMonsterResolver,
  RecordFactionKnowledgeKillResult,
} from "./types.js";

const LegacyFactionKnowledgeSnapshotSchema = z.object({
  version: z.literal(1),
  killsByMonster: z.record(z.string().min(1), z.number().int().nonnegative()),
});

const FactionKnowledgeSnapshotSchema = z.object({
  version: z.literal(2),
  killsByMonster: z.record(z.string().min(1), z.number().int().nonnegative()),
  killsByMonsterByContext: z.record(
    z.string().min(1),
    z.record(z.string().min(1), z.number().int().nonnegative()),
  ),
});

type FactionKnowledgeSnapshot = z.infer<typeof FactionKnowledgeSnapshotSchema>;

/**
 * Canonical persistent combat-knowledge ledger used by Bestiary, Relics and
 * Achievements. Lifetime per-monster totals remain authoritative for global
 * progression, while contextual counters let presentation query kills for a
 * specific authored world context without duplicating faction/elite totals.
 */
export class FactionKnowledgeService implements SaveProvider {
  readonly providerId = "faction_knowledge";

  readonly #resolver: FactionKnowledgeMonsterResolver;
  readonly #killsByMonster = new Map<string, number>();
  readonly #killsByMonsterByContext = new Map<string, Map<string, number>>();

  constructor(resolver: FactionKnowledgeMonsterResolver) {
    this.#resolver = resolver;
  }

  recordKill(monsterId: string, contextId?: string): RecordFactionKnowledgeKillResult {
    if (this.#resolver.resolveMonster(monsterId) === undefined) {
      return { ok: false, reason: "unknown_monster" };
    }
    const totalKills = (this.#killsByMonster.get(monsterId) ?? 0) + 1;
    this.#killsByMonster.set(monsterId, totalKills);

    const normalizedContextId = contextId?.trim();
    if (normalizedContextId !== undefined && normalizedContextId !== "") {
      let contextKills = this.#killsByMonsterByContext.get(monsterId);
      if (contextKills === undefined) {
        contextKills = new Map<string, number>();
        this.#killsByMonsterByContext.set(monsterId, contextKills);
      }
      contextKills.set(normalizedContextId, (contextKills.get(normalizedContextId) ?? 0) + 1);
    }

    return { ok: true, monsterId, totalKills };
  }

  getMonsterKillCount(monsterId: string, contextId?: string): number {
    if (contextId === undefined) return this.#killsByMonster.get(monsterId) ?? 0;
    return this.#killsByMonsterByContext.get(monsterId)?.get(contextId) ?? 0;
  }

  isMonsterDiscovered(monsterId: string): boolean {
    return this.getMonsterKillCount(monsterId) > 0;
  }

  getFactionKillCount(factionId: FactionId): number {
    let total = 0;
    for (const [monsterId, kills] of this.#killsByMonster) {
      if (this.#resolver.resolveMonster(monsterId)?.factionId === factionId) total += kills;
    }
    return total;
  }

  getFactionEliteKillCount(factionId: FactionId): number {
    let total = 0;
    for (const [monsterId, kills] of this.#killsByMonster) {
      const monster = this.#resolver.resolveMonster(monsterId);
      if (monster?.factionId === factionId && monster.isElite) total += kills;
    }
    return total;
  }

  getKnownMonsterIds(): readonly string[] {
    return [...this.#killsByMonster.entries()]
      .filter(([, kills]) => kills > 0)
      .map(([monsterId]) => monsterId);
  }

  save(): FactionKnowledgeSnapshot {
    const killsByMonsterByContext: Record<string, Record<string, number>> = {};
    for (const [monsterId, contextKills] of this.#killsByMonsterByContext) {
      killsByMonsterByContext[monsterId] = Object.fromEntries(contextKills);
    }

    return {
      version: 2,
      killsByMonster: Object.fromEntries(this.#killsByMonster),
      killsByMonsterByContext,
    };
  }

  load(data: unknown): void {
    const current = FactionKnowledgeSnapshotSchema.safeParse(data);
    const legacy = current.success ? undefined : LegacyFactionKnowledgeSnapshotSchema.safeParse(data);

    let killsByMonster: Record<string, number>;
    if (current.success) {
      killsByMonster = current.data.killsByMonster;
    } else {
      if (legacy === undefined || !legacy.success) return;
      killsByMonster = legacy.data.killsByMonster;
    }

    this.#killsByMonster.clear();
    this.#killsByMonsterByContext.clear();

    for (const [monsterId, kills] of Object.entries(killsByMonster)) {
      if (kills <= 0 || this.#resolver.resolveMonster(monsterId) === undefined) continue;
      this.#killsByMonster.set(monsterId, kills);
    }

    if (!current.success) return;
    for (const [monsterId, contextRecord] of Object.entries(current.data.killsByMonsterByContext)) {
      if (this.#resolver.resolveMonster(monsterId) === undefined) continue;
      const contextKills = new Map<string, number>();
      for (const [contextId, kills] of Object.entries(contextRecord)) {
        if (kills > 0) contextKills.set(contextId, kills);
      }
      if (contextKills.size > 0) this.#killsByMonsterByContext.set(monsterId, contextKills);
    }
  }
}
