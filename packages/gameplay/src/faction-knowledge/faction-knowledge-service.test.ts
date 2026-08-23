import { describe, expect, it } from "vitest";
import { FactionKnowledgeService } from "./faction-knowledge-service.js";

const MONSTERS = {
  keeperWarrior: { monsterId: "keeper_warrior", factionId: "keeper", isElite: false },
  keeperChampion: { monsterId: "keeper_champion", factionId: "keeper", isElite: true },
  morganaWitch: { monsterId: "morgana_witch", factionId: "morgana", isElite: false },
} as const;

function createService(): FactionKnowledgeService {
  return new FactionKnowledgeService({
    resolveMonster(monsterId) {
      return Object.values(MONSTERS).find((monster) => monster.monsterId === monsterId);
    },
  });
}

describe("FactionKnowledgeService", () => {
  it("stores one authoritative lifetime counter per monster", () => {
    const service = createService();
    expect(service.recordKill("keeper_warrior")).toEqual({
      ok: true,
      monsterId: "keeper_warrior",
      totalKills: 1,
    });
    service.recordKill("keeper_warrior");
    expect(service.getMonsterKillCount("keeper_warrior")).toBe(2);
    expect(service.isMonsterDiscovered("keeper_warrior")).toBe(true);
  });

  it("tracks contextual monster kills without changing lifetime totals", () => {
    const service = createService();
    service.recordKill("keeper_warrior", "zone_forest_t3");
    service.recordKill("keeper_warrior", "zone_forest_t3");
    service.recordKill("keeper_warrior", "zone_yellow_t5");

    expect(service.getMonsterKillCount("keeper_warrior")).toBe(3);
    expect(service.getMonsterKillCount("keeper_warrior", "zone_forest_t3")).toBe(2);
    expect(service.getMonsterKillCount("keeper_warrior", "zone_yellow_t5")).toBe(1);
    expect(service.getMonsterKillCount("keeper_warrior", "zone_black_t8")).toBe(0);
  });

  it("derives faction and elite totals instead of storing duplicate counters", () => {
    const service = createService();
    service.recordKill("keeper_warrior");
    service.recordKill("keeper_warrior");
    service.recordKill("keeper_champion");
    service.recordKill("morgana_witch");

    expect(service.getFactionKillCount("keeper")).toBe(3);
    expect(service.getFactionEliteKillCount("keeper")).toBe(1);
    expect(service.getFactionKillCount("morgana")).toBe(1);
  });

  it("rejects unknown monsters", () => {
    const service = createService();
    expect(service.recordKill("unknown")).toEqual({ ok: false, reason: "unknown_monster" });
  });

  it("persists lifetime and contextual counters", () => {
    const service = createService();
    service.recordKill("keeper_warrior", "zone_forest_t3");
    service.recordKill("keeper_champion", "zone_yellow_t5");
    const snapshot = service.save();
    snapshot.killsByMonster.obsolete = 99;
    snapshot.killsByMonsterByContext.obsolete = { zone_forest_t3: 99 };

    const restored = createService();
    restored.load(snapshot);
    expect(restored.getMonsterKillCount("keeper_warrior")).toBe(1);
    expect(restored.getMonsterKillCount("keeper_warrior", "zone_forest_t3")).toBe(1);
    expect(restored.getMonsterKillCount("keeper_champion", "zone_yellow_t5")).toBe(1);
    expect(restored.getMonsterKillCount("obsolete")).toBe(0);
  });

  it("loads legacy lifetime counters without inventing a world context", () => {
    const restored = createService();
    restored.load({
      version: 1,
      killsByMonster: { keeper_warrior: 4 },
    });

    expect(restored.getMonsterKillCount("keeper_warrior")).toBe(4);
    expect(restored.getMonsterKillCount("keeper_warrior", "zone_forest_t3")).toBe(0);
  });
});
