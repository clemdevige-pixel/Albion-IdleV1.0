import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import type {
  FactionId,
  FactionKnowledgeMonsterResolver,
  RecordFactionKnowledgeKillResult,
} from "./types.js";

const FactionKnowledgeSnapshotSchema = z.object({
  version: z.literal(1),
  killsByMonster: z.record(z.string().min(1), z.number().int().nonnegative()),
});

type FactionKnowledgeSnapshot = z.infer<typeof FactionKnowledgeSnapshotSchema>;

/**
 * Canonical persistent combat-knowledge ledger used by Bestiary, Relics and
 * Achievements. Only per-monster lifetime kills are stored; faction and elite
 * totals are derived through the authored monster resolver to avoid duplicated
 * counters drifting apart.
 */
export class FactionKnowledgeService implements SaveProvider {
  readonly providerId = "faction_knowledge";

  readonly #resolver: FactionKnowledgeMonsterResolver;
  readonly #killsByMonster = new Map<string, number>();

  constructor(resolver: FactionKnowledgeMonsterResolver) {
    this.#resolver = resolver;
  }

  recordKill(monsterId: string): RecordFactionKnowledgeKillResult {
    if (this.#resolver.resolveMonster(monsterId) === undefined) {
      return { ok: false, reason: "unknown_monster" };
    }
    const totalKills = (this.#killsByMonster.get(monsterId) ?? 0) + 1;
    this.#killsByMonster.set(monsterId, totalKills);
    return { ok: true, monsterId, totalKills };
  }

  getMonsterKillCount(monsterId: string): number {
    return this.#killsByMonster.get(monsterId) ?? 0;
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
    return {
      version: 1,
      killsByMonster: Object.fromEntries(this.#killsByMonster),
    };
  }

  load(data: unknown): void {
    const parsed = FactionKnowledgeSnapshotSchema.safeParse(data);
    if (!parsed.success) return;

    this.#killsByMonster.clear();
    for (const [monsterId, kills] of Object.entries(parsed.data.killsByMonster)) {
      if (kills <= 0 || this.#resolver.resolveMonster(monsterId) === undefined) continue;
      this.#killsByMonster.set(monsterId, kills);
    }
  }
}
