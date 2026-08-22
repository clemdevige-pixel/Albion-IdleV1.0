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

  it("examines a charged Relic only when the Academy authority allows it", () => {
    const fixture = createFixture({ canExamine: false });
    fixture.setFactionKills(10);
    fixture.service.recordMonsterKill("boss_keeper_ancient");
    fixture.setFactionKills(60);

    expect(fixture.service.examineRelic("relic_keeper"))
      .toEqual({ ok: false, reason: "examination_locked" });
    expect(fixture.service.isReconstructed("relic_keeper")).toBe(false);

    fixture.setCanExamine(true);
    expect(fixture.service.examineRelic("relic_keeper")).toEqual({ ok: true });
    expect(fixture.service.getProgress("relic_keeper")?.state).toBe("examined");
    expect(fixture.service.isReconstructed("relic_keeper")).toBe(true);
  });

  it("persists acquisition baseline and examined state", () => {
    const fixture = createFixture();
    fixture.setFactionKills(25);
    fixture.service.recordMonsterKill("boss_keeper_ancient");
    fixture.setFactionKills(75);
    fixture.service.examineRelic("relic_keeper");

    const restored = createFixture();
    restored.service.load(fixture.service.save());
    expect(restored.service.getProgress("relic_keeper")?.state).toBe("examined");
  });

  it("migrates old reconstructed Relics to examined state", () => {
    const fixture = createFixture();
    fixture.service.load({ version: 1, reconstructedRelicIds: ["relic_keeper"] });
    expect(fixture.service.getProgress("relic_keeper")?.state).toBe("examined");
  });

  it("rejects invalid authored charge contracts", () => {
    const fixture = createFixture();
    expect(fixture.service.registerRelic({ ...keeperRelic, id: "invalid", chargeKillCount: 0 }))
      .toEqual({ ok: false, reason: "invalid_definition" });
  });
});
