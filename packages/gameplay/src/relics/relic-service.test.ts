import { describe, expect, it } from "vitest";
import { RelicService } from "./relic-service.js";
import type { RelicDefinition } from "./types.js";

const keeperRelic: RelicDefinition = {
  id: "relic_keeper",
  factionId: "keeper",
  objectives: [
    { id: "discovery", requirement: { type: "all_monsters_killed", monsterIds: ["keeper_warrior", "keeper_shaman"], minimumEach: 1 } },
    { id: "familiarization", requirement: { type: "faction_kill_count", factionId: "keeper", minimum: 25 } },
    { id: "deep_study", requirement: { type: "faction_kill_count", factionId: "keeper", minimum: 100 } },
    { id: "elite_study", requirement: { type: "monster_kill_count", monsterId: "keeper_champion", minimum: 3 } },
    { id: "territory", requirement: { type: "world_segment_progress", zoneDefId: "zone_frostpeak", minimumCompletedSegments: 5 } },
  ],
};

function createFixture(options?: { readonly canReconstruct?: boolean }) {
  const monsterKills = new Map<string, number>();
  let factionKills = 0;
  let eliteKills = 0;
  let completedSegments = 0;
  let canReconstruct = options?.canReconstruct ?? true;
  const service = new RelicService(
    {
      getMonsterKillCount: (id) => monsterKills.get(id) ?? 0,
      getFactionKillCount: () => factionKills,
      getFactionEliteKillCount: () => eliteKills,
      getCompletedSegmentCount: () => completedSegments,
    },
    {
      canReconstructRelic: () => canReconstruct,
    },
  );
  service.registerRelic(keeperRelic);
  return {
    service,
    monsterKills,
    setFactionKills(value: number) { factionKills = value; },
    setEliteKills(value: number) { eliteKills = value; },
    setCompletedSegments(value: number) { completedSegments = value; },
    setCanReconstruct(value: boolean) { canReconstruct = value; },
  };
}

function completeKeeperObjectives(fixture: ReturnType<typeof createFixture>): void {
  fixture.monsterKills.set("keeper_warrior", 1);
  fixture.monsterKills.set("keeper_shaman", 1);
  fixture.monsterKills.set("keeper_champion", 3);
  fixture.setFactionKills(100);
  fixture.setEliteKills(3);
  fixture.setCompletedSegments(5);
}

describe("RelicService", () => {
  it("derives fragment progress from authoritative sources and reconstructs automatically", () => {
    const fixture = createFixture();
    completeKeeperObjectives(fixture);

    expect(fixture.service.getProgress("relic_keeper")?.fragmentCount).toBe(5);
    expect(fixture.service.resolveCompletedRelics()).toEqual(["relic_keeper"]);
    expect(fixture.service.isReconstructed("relic_keeper")).toBe(true);
    expect(fixture.service.resolveCompletedRelics()).toEqual([]);
  });

  it("keeps historical objective progress while reconstruction authority is locked", () => {
    const fixture = createFixture({ canReconstruct: false });
    completeKeeperObjectives(fixture);

    expect(fixture.service.getProgress("relic_keeper")?.fragmentCount).toBe(5);
    expect(fixture.service.resolveCompletedRelics()).toEqual([]);
    expect(fixture.service.isReconstructed("relic_keeper")).toBe(false);

    fixture.setCanReconstruct(true);
    expect(fixture.service.resolveCompletedRelics()).toEqual(["relic_keeper"]);
  });

  it("persists only permanent reconstruction, not duplicated objective counters", () => {
    const fixture = createFixture();
    completeKeeperObjectives(fixture);
    fixture.service.resolveCompletedRelics();

    const restored = createFixture();
    restored.service.load(fixture.service.save());
    expect(restored.service.isReconstructed("relic_keeper")).toBe(true);
  });

  it("requires exactly five authored objectives in V1", () => {
    const fixture = createFixture();
    expect(fixture.service.registerRelic({ ...keeperRelic, id: "invalid", objectives: keeperRelic.objectives.slice(0, 4) }))
      .toEqual({ ok: false, reason: "invalid_definition" });
  });
});
