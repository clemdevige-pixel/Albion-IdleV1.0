import { describe, expect, it } from "vitest";
import { RelicService } from "./relic-service.js";
import type { RelicDefinition } from "./types.js";

const dungeonRelic: RelicDefinition = {
  id: "relic_dungeon",
  source: {
    monsterId: "boss_keeper_ancient",
    contextId: "zone_mountain_t4",
    segmentIndex: 9,
  },
  inventoryItemId: "item_relic_dungeon",
  chargeRequirements: [
    { factionId: "keeper", killCount: 50 },
    { factionId: "heretic", killCount: 50 },
    { factionId: "undead", killCount: 50 },
    { factionId: "morgana", killCount: 50 },
  ],
};

function createFixture() {
  const factionKills = new Map<string, number>();
  const service = new RelicService({
    getFactionKillCount: (factionId) => factionKills.get(factionId) ?? 0,
  });
  service.registerRelic(dungeonRelic);
  return {
    service,
    setFactionKills(factionId: string, value: number) { factionKills.set(factionId, value); },
  };
}

describe("RelicService", () => {
  it("acquires only from the exact authored contextual source", () => {
    const fixture = createFixture();

    expect(fixture.service.recordMonsterKill("boss_keeper_ancient")).toEqual([]);
    expect(fixture.service.recordMonsterKill({
      monsterId: "boss_keeper_ancient",
      contextId: "zone_forest_t3",
      segmentIndex: 9,
    })).toEqual([]);
    expect(fixture.service.recordMonsterKill({
      monsterId: "boss_keeper_ancient",
      contextId: "zone_mountain_t4",
      segmentIndex: 8,
    })).toEqual([]);

    expect(fixture.service.recordMonsterKill({
      monsterId: "boss_keeper_ancient",
      contextId: "zone_mountain_t4",
      segmentIndex: 9,
    })).toEqual(["relic_dungeon"]);
  });

  it("charges independently from 50 post-acquisition kills of every authored faction", () => {
    const fixture = createFixture();
    fixture.setFactionKills("keeper", 100);
    fixture.setFactionKills("heretic", 200);
    fixture.setFactionKills("undead", 300);
    fixture.setFactionKills("morgana", 400);
    fixture.service.recordMonsterKill({
      monsterId: "boss_keeper_ancient",
      contextId: "zone_mountain_t4",
      segmentIndex: 9,
    });

    fixture.setFactionKills("keeper", 150);
    fixture.setFactionKills("heretic", 250);
    fixture.setFactionKills("undead", 350);
    fixture.setFactionKills("morgana", 449);
    expect(fixture.service.getProgress("relic_dungeon")).toMatchObject({
      state: "broken",
      chargeKills: 199,
      requiredChargeKills: 200,
    });

    fixture.setFactionKills("morgana", 450);
    expect(fixture.service.getProgress("relic_dungeon")).toMatchObject({
      state: "charged",
      chargeKills: 200,
      requiredChargeKills: 200,
      chargeObjectives: [
        { factionId: "keeper", chargeKills: 50, requiredChargeKills: 50 },
        { factionId: "heretic", chargeKills: 50, requiredChargeKills: 50 },
        { factionId: "undead", chargeKills: 50, requiredChargeKills: 50 },
        { factionId: "morgana", chargeKills: 50, requiredChargeKills: 50 },
      ],
    });
  });

  it("does not acquire when the inventory object cannot be granted", () => {
    const fixture = createFixture();
    const source = {
      monsterId: "boss_keeper_ancient",
      contextId: "zone_mountain_t4",
      segmentIndex: 9,
    } as const;

    expect(fixture.service.recordMonsterKill(source, () => false)).toEqual([]);
    expect(fixture.service.getProgress("relic_dungeon")?.state).toBe("unobtained");
    expect(fixture.service.recordMonsterKill(source, () => true)).toEqual(["relic_dungeon"]);
  });

  it("stays charged until the owning Research flow marks examination complete", () => {
    const fixture = createFixture();
    fixture.service.recordMonsterKill({
      monsterId: "boss_keeper_ancient",
      contextId: "zone_mountain_t4",
      segmentIndex: 9,
    });
    for (const factionId of ["keeper", "heretic", "undead", "morgana"] as const) {
      fixture.setFactionKills(factionId, 50);
    }

    expect(fixture.service.getProgress("relic_dungeon")?.state).toBe("charged");
    expect(fixture.service.examineRelic("relic_dungeon")).toEqual({ ok: true });
    expect(fixture.service.getProgress("relic_dungeon")?.state).toBe("examined");
  });

  it("persists every faction baseline and examined state in V4", () => {
    const fixture = createFixture();
    fixture.setFactionKills("keeper", 10);
    fixture.setFactionKills("heretic", 20);
    fixture.setFactionKills("undead", 30);
    fixture.setFactionKills("morgana", 40);
    fixture.service.recordMonsterKill({
      monsterId: "boss_keeper_ancient",
      contextId: "zone_mountain_t4",
      segmentIndex: 9,
    });
    fixture.setFactionKills("keeper", 60);
    fixture.setFactionKills("heretic", 70);
    fixture.setFactionKills("undead", 80);
    fixture.setFactionKills("morgana", 90);
    fixture.service.examineRelic("relic_dungeon");

    const restored = createFixture();
    restored.setFactionKills("keeper", 60);
    restored.setFactionKills("heretic", 70);
    restored.setFactionKills("undead", 80);
    restored.setFactionKills("morgana", 90);
    restored.service.load(fixture.service.save());
    expect(restored.service.getProgress("relic_dungeon")?.state).toBe("examined");
  });

  it("does not map obsolete faction Relic snapshots onto the new global Relic", () => {
    const fixture = createFixture();
    fixture.service.load({ version: 3, acquiredRelics: [
      { relicId: "relic_keeper", acquiredAtFactionKillCount: 10 },
    ], examinedRelicIds: ["relic_keeper"] });
    expect(fixture.service.getProgress("relic_dungeon")?.state).toBe("unobtained");
  });

  it("rejects invalid duplicate or zero-count charge objectives", () => {
    const service = new RelicService({ getFactionKillCount: () => 0 });
    expect(service.registerRelic({
      ...dungeonRelic,
      id: "invalid_zero",
      chargeRequirements: [{ factionId: "keeper", killCount: 0 }],
    })).toEqual({ ok: false, reason: "invalid_definition" });
    expect(service.registerRelic({
      ...dungeonRelic,
      id: "invalid_duplicate",
      chargeRequirements: [
        { factionId: "keeper", killCount: 50 },
        { factionId: "keeper", killCount: 50 },
      ],
    })).toEqual({ ok: false, reason: "invalid_definition" });
  });
});
