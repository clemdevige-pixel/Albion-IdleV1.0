import { describe, expect, it } from "vitest";
import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import { getEnemyCombatProfile, getEncounterRewards } from "../combat-profile.js";

describe("combat-profile", () => {
  describe("getEnemyCombatProfile", () => {
    it("calculates normal enemy profile for zone 0, segment 0, encounter 0", () => {
      const profile = getEnemyCombatProfile(0, 0, 0);
      expect(profile).toEqual({
        hp: 300,
        damage: 19,
        armor: 5,
        magicResistance: 3,
        attackSpeed: 0.8,
      });
    });

    it("calculates boss enemy profile for zone 0, segment 0, encounter 4 (boss)", () => {
      const bossProfile = getEnemyCombatProfile(0, 0, 4);
      expect(bossProfile.hp).toBeGreaterThan(500);
      expect(bossProfile.damage).toBeGreaterThan(25);
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

    it("keeps each segment boss clearly above the preceding normal encounter", () => {
      for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        const normal = getEnemyCombatProfile(
          0,
          segmentIndex,
          ENCOUNTERS_PER_SEGMENT - 2,
        );
        const boss = getEnemyCombatProfile(
          0,
          segmentIndex,
          ENCOUNTERS_PER_SEGMENT - 1,
        );

        expect(boss.hp).toBeGreaterThan(normal.hp);
        expect(boss.damage).toBeGreaterThan(normal.damage);
        expect(boss.armor).toBeGreaterThanOrEqual(normal.armor);
      }
    });
  });

  describe("getEncounterRewards", () => {
    it("calculates normal encounter rewards for zone 0, segment 0, encounter 0", () => {
      const rewards = getEncounterRewards(0, 0, 0);
      expect(rewards).toEqual({
        silver: 10,
        fame: 15,
      });
    });

    it("doubles rewards for boss encounter (encounterIndex 4)", () => {
      const normalRewards = getEncounterRewards(0, 0, 0);
      const bossRewards = getEncounterRewards(0, 0, 4);
      expect(bossRewards.silver).toBe(normalRewards.silver * 2);
      expect(bossRewards.fame).toBe(normalRewards.fame * 2);
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

    it("keeps every segment boss at exactly double its segment normal reward", () => {
      for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
        const normal = getEncounterRewards(0, segmentIndex, 0);
        const boss = getEncounterRewards(
          0,
          segmentIndex,
          ENCOUNTERS_PER_SEGMENT - 1,
        );
        expect(boss.silver).toBe(normal.silver * 2);
        expect(boss.fame).toBe(normal.fame * 2);
      }
    });
  });
});
