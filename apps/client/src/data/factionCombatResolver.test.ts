import { describe, expect, it } from "vitest";
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";

describe("factionCombatResolver", () => {
  it("normalizes Tower-style faction ids for artifact weapon advantage", () => {
    expect(resolveFactionCombatModifiers(
      { weaponItemId: "item_weapon_sword_clarent_t4" },
      { factionId: "morgana", tier: 4 },
    )).toEqual({
      outgoingDamageBonusPercent: 20,
      incomingDamageReductionPercent: 0,
    });
  });

  it("resolves faction Cape mitigation from the same combat context", () => {
    expect(resolveFactionCombatModifiers(
      { capeItemId: "item_cape_t4_keeper" },
      { factionId: "keeper", tier: 8 },
    )).toEqual({
      outgoingDamageBonusPercent: 0,
      incomingDamageReductionPercent: 6,
    });
  });

  it("keeps mismatched or under-tier equipment inactive", () => {
    expect(resolveFactionCombatModifiers(
      {
        weaponItemId: "item_weapon_sword_clarent_t4",
        capeItemId: "item_cape_t6_keeper",
      },
      { factionId: "undead", tier: 5 },
    )).toEqual({
      outgoingDamageBonusPercent: 0,
      incomingDamageReductionPercent: 0,
    });
  });
});
