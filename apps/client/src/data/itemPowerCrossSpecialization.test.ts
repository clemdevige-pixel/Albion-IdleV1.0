import { describe, expect, it } from "vitest";
import {
  WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL,
  WEAPON_FAMILY_IP_PER_LEVEL,
  WEAPON_SPECIALIZATION_IP_PER_LEVEL,
  getMasteryItemPowerBonus,
} from "./itemPower.js";

describe("weapon mastery cross-specialization item power", () => {
  it("adds family, equipped specialization and sibling specialization IP without double-counting the equipped weapon", () => {
    const bonus = getMasteryItemPowerBonus("item_weapon_sword_t4_broadsword", [
      { id: "mastery_sword", level: 40 },
      { id: "mastery_broadsword", level: 30 },
      { id: "mastery_clarent_blade", level: 10 },
      { id: "mastery_carving_sword", level: 20 },
      { id: "mastery_galatine_pair", level: 30 },
      { id: "mastery_claymore", level: 40 },
      { id: "mastery_bow", level: 100 },
      { id: "mastery_longbow", level: 100 },
    ]);

    expect(WEAPON_FAMILY_IP_PER_LEVEL).toBe(0.5);
    expect(WEAPON_SPECIALIZATION_IP_PER_LEVEL).toBe(1);
    expect(WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL).toBe(0.2);
    expect(bonus).toBe(70);
  });

  it("keeps the legacy result when no sibling specialization has progress", () => {
    expect(getMasteryItemPowerBonus("item_weapon_bow_t4_longbow", [
      { id: "mastery_bow", level: 30 },
      { id: "mastery_longbow", level: 30 },
    ])).toBe(45);
  });
});
