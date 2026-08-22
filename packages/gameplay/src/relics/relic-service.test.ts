import { describe, expect, it } from "vitest";
import { RelicService } from "./relic-service.js";
import type { RelicDefinition } from "./types.js";

const keeperRelic: RelicDefinition = {
  id: "relic_keeper",
  factionId: "keeper",
  sourceBossMonsterId: "boss_keeper_ancient",
  inventoryItemId: "item_relic_keeper",
  chargeKillCount: 50,
};

function createFixture(options?: { readonly canExamine?: boolean }) {
  let factionKills = 0;
  let canExamine = options?.canExamine ?? true;
  const service = new RelicService(
    {
      getFactionKillCount: () => factionKills,
    },
    {
      canReconstructRelic: () => canExamine,
    },
  );
  service.registerRelic(keeperRelic);
  return {
    service,
    setFactionKills(value: number) { factionKills = value; },
    setCanExamine(value: boolean) { canExamine = value; },
  };
}

describe("RelicService", () => {
  it("drops the broken Relic on its authored boss and counts only later faction kills", () => {
    const fixture = createFixture();
    fixture.setFactionKills(120);

    expect(fixture.service.recordMonsterKill("boss_keeper_ancient")).toEqual(["relic_keeper"]);
    expect(fixture.service.getProgress("relic_keeper")).toMatchObject({
      state: "broken",
      chargeKills: 0,
      requiredChargeKills: 50,
    });

    fixture.setFactionKills(169);
    expect(fixture.service.getProgress("relic_keeper")).toMatchObject({ state: "broken", chargeKills: 49 });
    fixture.setFactionKills(170);
    expect(fixture.service.getProgress("relic_keeper")).toMatchObject({ state: "charged", chargeKills: 50 });
  });

  it("does not acquire a Relic when its inventory object cannot be granted", () => {
    const fixture = createFixture();
    fixture.setFactionKills(20);

    expect(fixture.service.recordMonsterKill("boss_keeper_ancient", () => false)).toEqual([]);
    expect(fixture.service.getProgress("relic_keeper")?.state).toBe("unobtained");

    expect(fixture.service.recordMonsterKill("boss_keeper_ancient", () => true))
      .toEqual(["relic_keeper"]);
    expect(fixture.service.getProgress("relic_keeper")).toMatchObject({
      state: "broken",
      chargeKills: 0,
    });
  });

  it("stays charged until an explicit Academy examination succeeds", () => {
    const fixture = createFixture({ canExamine: false });
    fixture.setFactionKills(10);
    fixture.service.recordMonsterKill("boss_keeper_ancient");
    fixture.setFactionKills(60);

    expect(fixture.service.getProgress("relic_keeper")?.state).toBe("charged");
    expect(fixture.service.isReconstructed("relic_keeper")).toBe(false);
    expect(fixture.service.examineRelic("relic_keeper"))
      .toEqual({ ok: false, reason: "examination_locked" });
    expect(fixture.service.getProgress("relic_keeper")?.state).toBe("charged");

    fixture.setCanExamine(true);
    expect(fixture.service.getProgress("relic_keeper")?.state).toBe("charged");
    expect(fixture.service.examineRelic("relic_keeper")).toEqual({ ok: true });
    expect(fixture.service.getProgress("relic_keeper")?.state).toBe("examined");
    expect(fixture.service.isReconstructed("relic_keeper")).toBe(true);
  });

  it("persists acquisition baseline and explicitly examined state in V3", () => {
    const fixture = createFixture();
    fixture.setFactionKills(25);
    fixture.service.recordMonsterKill("boss_keeper_ancient");
    fixture.setFactionKills(75);
    fixture.service.examineRelic("relic_keeper");

    const restored = createFixture();
    restored.setFactionKills(75);
    restored.service.load(fixture.service.save());
    expect(restored.service.getProgress("relic_keeper")?.state).toBe("examined");
  });

  it("migrates V1 auto-reconstructed Relics to broken 0/50 from the current kill count", () => {
    const fixture = createFixture();
    fixture.setFactionKills(137);
    fixture.service.load({ version: 1, reconstructedRelicIds: ["relic_keeper"] });

    expect(fixture.service.getProgress("relic_keeper")).toMatchObject({
      state: "broken",
      chargeKills: 0,
      reconstructed: false,
    });
    fixture.setFactionKills(138);
    expect(fixture.service.getProgress("relic_keeper")?.chargeKills).toBe(1);
  });

  it("migrates V2 auto-examined Relics without inheriting historical kills", () => {
    const fixture = createFixture();
    fixture.setFactionKills(240);
    fixture.service.load({
      version: 2,
      acquiredRelics: [{ relicId: "relic_keeper", acquiredAtFactionKillCount: 10 }],
      examinedRelicIds: ["relic_keeper"],
    });

    expect(fixture.service.getProgress("relic_keeper")).toMatchObject({
      state: "broken",
      chargeKills: 0,
      reconstructed: false,
    });
  });

  it("rejects invalid authored charge contracts", () => {
    const fixture = createFixture();
    expect(fixture.service.registerRelic({ ...keeperRelic, id: "invalid", chargeKillCount: 0 }))
      .toEqual({ ok: false, reason: "invalid_definition" });
  });
});
