import { describe, expect, it } from "vitest";
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
  });
});
