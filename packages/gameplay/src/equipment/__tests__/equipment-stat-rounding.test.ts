import { describe, expect, it } from "vitest";
import { roundEquipmentStatValue } from "../equipment-stat-rounding.js";
import type { StatId } from "../../stats/types.js";

const HP = "stat_max_health" as StatId;
const ARMOR = "stat_armor" as StatId;
const MR = "stat_magic_resistance" as StatId;
const ATTACK_SPEED = "stat_attack_speed" as StatId;

describe("equipment stat rounding", () => {
  it("rounds max health to the nearest five with ties upward", () => {
    expect(roundEquipmentStatValue(HP, 142)).toBe(140);
    expect(roundEquipmentStatValue(HP, 143)).toBe(145);
    expect(roundEquipmentStatValue(HP, 147.5)).toBe(150);
  });

  it("rounds armor and magic resistance to integers with ties upward", () => {
    expect(roundEquipmentStatValue(ARMOR, 7.4)).toBe(7);
    expect(roundEquipmentStatValue(ARMOR, 7.5)).toBe(8);
    expect(roundEquipmentStatValue(MR, 12.5)).toBe(13);
  });

  it("leaves identity stats without a rounding quantum unchanged", () => {
    expect(roundEquipmentStatValue(ATTACK_SPEED, 1.125)).toBe(1.125);
  });
});
