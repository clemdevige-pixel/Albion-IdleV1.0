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

  it("persists known counters and ignores obsolete monster ids on restore", () => {
    const service = createService();
    service.recordKill("keeper_warrior");
    service.recordKill("keeper_champion");
    const snapshot = service.save();
    snapshot.killsByMonster.obsolete = 99;

    const restored = createService();
    restored.load(snapshot);
    expect(restored.getMonsterKillCount("keeper_warrior")).toBe(1);
    expect(restored.getMonsterKillCount("keeper_champion")).toBe(1);
    expect(restored.getMonsterKillCount("obsolete")).toBe(0);
  });
});
