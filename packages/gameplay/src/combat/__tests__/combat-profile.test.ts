import { describe, expect, it } from "vitest";
import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import { getEnemyCombatProfile, getEncounterRewards } from "../combat-profile.js";

describe("combat-profile", () => {
  describe("getEnemyCombatProfile", () => {
    it("calculates the recalibrated normal enemy profile for Blue start", () => {
      const profile = getEnemyCombatProfile(0, 0, 0);
      expect(profile).toEqual({ hp: 270, damage: 10, armor: 4, magicResistance: 2, attackSpeed: 0.8 });
    });

    it("preserves legacy T3 magic defense but uses rank parity from T4 onward", () => {
      const t3Boss = getEnemyCombatProfile(2, SEGMENTS_PER_ZONE - 1, ENCOUNTERS_PER_SEGMENT - 1, "blue");
      const t4Boss = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, ENCOUNTERS_PER_SEGMENT - 1, "blue");
      const t5Boss = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, ENCOUNTERS_PER_SEGMENT - 1, "yellow");
      const t6Boss = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, ENCOUNTERS_PER_SEGMENT - 1, "orange");
      const t7Boss = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, ENCOUNTERS_PER_SEGMENT - 1, "red");

      expect(t3Boss.magicResistance).toBeLessThan(t3Boss.armor);
      for (const profile of [t4Boss, t5Boss, t6Boss, t7Boss]) {
        expect(profile.magicResistance).toBe(profile.armor);
      }
    });

    it("treats encounter five as an elite before segment 10", () => {
      const normal = getEnemyCombatProfile(0, 0, 3);
      const elite = getEnemyCombatProfile(0, 0, 4);
      expect(elite.hp).toBeGreaterThan(normal.hp);
      expect(elite.damage).toBeGreaterThan(normal.damage);
      expect(elite.armor).toBeGreaterThan(normal.armor);
      expect(elite.hp).toBeLessThan(500);
    });

    it("reserves the full boss envelope for encounter five of segment 10", () => {
      const elite = getEnemyCombatProfile(0, SEGMENTS_PER_ZONE - 2, 4);
      const boss = getEnemyCombatProfile(0, SEGMENTS_PER_ZONE - 1, 4);
      expect(boss.hp).toBeGreaterThan(elite.hp);
      expect(boss.damage).toBeGreaterThan(elite.damage);
      expect(boss.armor).toBeGreaterThan(elite.armor);
    });

    it("scales stats for higher zone and segment indices", () => {
      const zone0 = getEnemyCombatProfile(0, 0, 0);
      const zone1 = getEnemyCombatProfile(1, 0, 0);
      const zone3 = getEnemyCombatProfile(3, 0, 0);
      expect(zone1.hp).toBeGreaterThan(zone0.hp);
      expect(zone1.damage).toBeGreaterThan(zone0.damage);
      expect(zone3.armor).toBeGreaterThan(zone0.armor);
    });

    it("keeps the Blue Zone difficulty curve monotonic from segment 1 to 10", () => {
      let previous = getEnemyCombatProfile(0, 0, 0);
      for (let segmentIndex = 1; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        const current = getEnemyCombatProfile(0, segmentIndex, 0);
        expect(current.hp).toBeGreaterThan(previous.hp);
        expect(current.damage).toBeGreaterThanOrEqual(previous.damage);
        expect(current.armor).toBeGreaterThanOrEqual(previous.armor);
        expect(current.magicResistance).toBeGreaterThanOrEqual(previous.magicResistance);
        expect(current.attackSpeed).toBe(previous.attackSpeed);
        previous = current;
      }
    });

    it("keeps each segment elite/boss clearly above the preceding normal encounter", () => {
      for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        const normal = getEnemyCombatProfile(0, segmentIndex, ENCOUNTERS_PER_SEGMENT - 2);
        const special = getEnemyCombatProfile(0, segmentIndex, ENCOUNTERS_PER_SEGMENT - 1);
        expect(special.hp).toBeGreaterThan(normal.hp);
        expect(special.damage).toBeGreaterThan(normal.damage);
        expect(special.armor).toBeGreaterThanOrEqual(normal.armor);
      }
    });

    it("keeps Mountain S10 structurally above the preceding Mountain segment", () => {
      const previousNormal = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 2, 3, "blue");
      const normal = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, 3, "blue");
      const boss = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, 4, "blue");
      expect(normal.hp).toBeGreaterThan(previousNormal.hp);
      expect(normal.damage).toBeGreaterThanOrEqual(previousNormal.damage);
      expect(normal.armor).toBeGreaterThanOrEqual(previousNormal.armor);
      expect(boss.hp).toBeGreaterThan(normal.hp);
      expect(boss.damage).toBeGreaterThan(normal.damage);
    });

    it("uses independent Blue, Yellow, Orange and Red curves", () => {
      const blueEnd = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, 0, "blue");
      const yellowStart = getEnemyCombatProfile(0, 0, 0, "yellow");
      const yellowEnd = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, 0, "yellow");
      const orangeStart = getEnemyCombatProfile(0, 0, 0, "orange");
      const orangeEnd = getEnemyCombatProfile(4, SEGMENTS_PER_ZONE - 1, 0, "orange");
      const redStart = getEnemyCombatProfile(0, 0, 0, "red");

      expect(yellowStart.hp).toBeGreaterThanOrEqual(blueEnd.hp);
      expect(yellowStart.damage).toBeGreaterThanOrEqual(blueEnd.damage);
      expect(orangeStart.hp).toBeGreaterThanOrEqual(yellowEnd.hp);
      expect(orangeStart.damage).toBeGreaterThanOrEqual(yellowEnd.damage);
      expect(redStart.hp).toBeGreaterThanOrEqual(orangeEnd.hp);
      expect(redStart.damage).toBeGreaterThanOrEqual(orangeEnd.damage);
    });

    it.each(["yellow", "orange", "red"] as const)("keeps %s deterministic and monotonic across its five zones", (bandId) => {
      const first = getEnemyCombatProfile(0, 0, 0, bandId);
      let previous = first;
      for (let zoneIndex = 0; zoneIndex < 5; zoneIndex += 1) {
        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          const current = getEnemyCombatProfile(zoneIndex, segmentIndex, 0, bandId);
          expect(current.hp).toBeGreaterThanOrEqual(previous.hp);
          expect(current.damage).toBeGreaterThanOrEqual(previous.damage);
          expect(current.armor).toBeGreaterThanOrEqual(previous.armor);
          previous = current;
        }
      }
    });
  });

  describe("getEncounterRewards", () => {
    it("calculates normal encounter rewards for zone 0, segment 0, encounter 0", () => {
      expect(getEncounterRewards(0, 0, 0)).toEqual({ silver: 10, fame: 15 });
    });

    it("doubles rewards for encounter five", () => {
      const normalRewards = getEncounterRewards(0, 0, 0);
      const specialRewards = getEncounterRewards(0, 0, 4);
      expect(specialRewards.silver).toBe(normalRewards.silver * 2);
      expect(specialRewards.fame).toBe(normalRewards.fame * 2);
    });

    it("increases rewards for higher progression ranks", () => {
      const rank0 = getEncounterRewards(0, 0, 0);
      const rankHigher = getEncounterRewards(1, 0, 0);
      expect(rankHigher.silver).toBeGreaterThan(rank0.silver);
      expect(rankHigher.fame).toBeGreaterThan(rank0.fame);
    });

    it("keeps Blue Zone normal rewards monotonic across all segments", () => {
      let previous = getEncounterRewards(0, 0, 0);
      for (let segmentIndex = 1; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        const current = getEncounterRewards(0, segmentIndex, 0);
        expect(current.silver).toBeGreaterThanOrEqual(previous.silver);
        expect(current.fame).toBeGreaterThanOrEqual(previous.fame);
        previous = current;
      }
    });

    it("keeps every encounter-five reward at exactly double its segment normal reward", () => {
      for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        const normal = getEncounterRewards(0, segmentIndex, 0);
        const special = getEncounterRewards(0, segmentIndex, ENCOUNTERS_PER_SEGMENT - 1);
        expect(special.silver).toBe(normal.silver * 2);
        expect(special.fame).toBe(normal.fame * 2);
      }
    });

    it("continues reward ranks through Yellow, Orange and Red", () => {
      const blueEnd = getEncounterRewards(4, SEGMENTS_PER_ZONE - 1, 0, "blue");
      const yellowStart = getEncounterRewards(0, 0, 0, "yellow");
      const yellowEnd = getEncounterRewards(4, SEGMENTS_PER_ZONE - 1, 0, "yellow");
      const orangeStart = getEncounterRewards(0, 0, 0, "orange");
      const orangeEnd = getEncounterRewards(4, SEGMENTS_PER_ZONE - 1, 0, "orange");
      const redStart = getEncounterRewards(0, 0, 0, "red");
      expect(yellowStart.silver).toBeGreaterThan(blueEnd.silver);
      expect(yellowStart.fame).toBeGreaterThan(blueEnd.fame);
      expect(orangeStart.silver).toBeGreaterThan(yellowEnd.silver);
      expect(orangeStart.fame).toBeGreaterThan(yellowEnd.fame);
      expect(redStart.silver).toBeGreaterThan(orangeEnd.silver);
      expect(redStart.fame).toBeGreaterThan(orangeEnd.fame);
    });
  });
});
