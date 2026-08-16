import { describe, expect, it } from "vitest";
import { DamageManager, type DamageRequest, type DamageResult } from "@game/gameplay";
import { CombatRuntime } from "../runtime/CombatRuntime.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveUnlockedWeaponAbilities } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS = [
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;
const ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;

type DamageBucket = { hits: number; finalDamage: number; targets: Set<number> };
type SourceBuckets = Map<number, Record<DamageRequest["source_type"], DamageBucket>>;
type SlotBuckets = Map<number, Map<number, DamageBucket>>;

function bucket(): DamageBucket { return { hits: 0, finalDamage: 0, targets: new Set<number>() }; }
function sourceBuckets(): Record<DamageRequest["source_type"], DamageBucket> {
  return { auto_attack: bucket(), ability: bucket(), effect: bucket(), other: bucket() };
}
function playerSource(sources: SourceBuckets) {
  return [...sources.entries()].map(([source, buckets]) => {
    const targets = new Set<number>();
    for (const value of Object.values(buckets)) for (const target of value.targets) targets.add(target);
    return { source, buckets, distinctTargets: targets.size };
  }).sort((a, b) => b.distinctTargets - a.distinctTargets)[0];
}
function dps(damage: number, seconds: number): number { return Number((damage / Math.max(0.001, seconds)).toFixed(2)); }

describe("Blue weapon runtime control", () => {
  it("measures Frostpeak S10 T4.2 damage by AA / Q / W / ultimate", () => {
    const originalProcessDamage = DamageManager.prototype.processDamage;
    const originalUseWeaponAbility = CombatRuntime.prototype.useWeaponAbility;
    let activeSources: SourceBuckets | undefined;
    let activeSlots: SlotBuckets | undefined;
    let activeSlot: number | undefined;
    let casts: number[] | undefined;

    DamageManager.prototype.processDamage = function patched(request: DamageRequest): DamageResult | null {
      const result = originalProcessDamage.call(this, request);
      if (activeSources !== undefined && result !== null) {
        const source = Number(request.source);
        let byType = activeSources.get(source);
        if (byType === undefined) { byType = sourceBuckets(); activeSources.set(source, byType); }
        const targetBucket = byType[request.source_type];
        targetBucket.hits += 1;
        targetBucket.finalDamage += result.finalDamage;
        targetBucket.targets.add(Number(request.target));
        if (request.source_type === "ability" && activeSlot !== undefined && activeSlots !== undefined) {
          let bySlot = activeSlots.get(source);
          if (bySlot === undefined) { bySlot = new Map(); activeSlots.set(source, bySlot); }
          let slotBucket = bySlot.get(activeSlot);
          if (slotBucket === undefined) { slotBucket = bucket(); bySlot.set(activeSlot, slotBucket); }
          slotBucket.hits += 1;
          slotBucket.finalDamage += result.finalDamage;
          slotBucket.targets.add(Number(request.target));
        }
      }
      return result;
    };

    CombatRuntime.prototype.useWeaponAbility = function patched(slot: number): boolean {
      activeSlot = slot;
      try {
        const used = originalUseWeaponAbility.call(this, slot);
        if (used && casts !== undefined) casts[slot] = (casts[slot] ?? 0) + 1;
        return used;
      } finally { activeSlot = undefined; }
    };

    try {
      const rows = WEAPONS.map((weaponItemId) => {
        activeSources = new Map();
        activeSlots = new Map();
        casts = [];
        const result = runCombatRuntimeBenchmark({
          label: "frostpeak_s10_t4_2_m22",
          weaponItemId,
          zoneDefId: WORLD_ZONE_IDS.mountain,
          segmentIndex: 9,
          equipmentItemIds: ARMOR,
          masteryLevel: 22,
          enchantment: 2,
          useHealthPotions: false,
        });
        const player = playerSource(activeSources);
        if (player === undefined) throw new Error(`No player damage for ${weaponItemId}`);
        const slots = activeSlots.get(player.source) ?? new Map<number, DamageBucket>();
        const abilities = resolveUnlockedWeaponAbilities(weaponItemId, 22);
        const slotRows = abilities.map((ability, slot) => {
          const value = slots.get(slot) ?? bucket();
          return { key: slot === 0 ? "Q" : slot === 1 ? "W" : "ULT", abilityId: ability.id, casts: casts?.[slot] ?? 0, hits: value.hits, dps: dps(value.finalDamage, result.seconds) };
        });
        const aa = player.buckets.auto_attack;
        const effect = player.buckets.effect;
        const total = Object.values(player.buckets).reduce((sum, value) => sum + value.finalDamage, 0);
        return {
          weapon: weaponItemId.replace("item_weapon_", "").replace("_t4_", " "),
          clear: result.clear,
          seconds: result.seconds,
          hpPercent: result.hpPercent,
          totalDps: dps(total, result.seconds),
          aaDps: dps(aa.finalDamage, result.seconds),
          qDps: slotRows[0]?.dps ?? 0,
          wDps: slotRows[1]?.dps ?? 0,
          ultDps: slotRows[2]?.dps ?? 0,
          effectDps: dps(effect.finalDamage, result.seconds),
          slots: slotRows,
        };
      });

      console.table(rows.map(({ weapon, clear, totalDps, aaDps, qDps, wDps, ultDps, effectDps }) => ({ weapon, clear, totalDps, aaDps, qDps, wDps, ultDps, effectDps })));
      console.log("[BLUE_WEAPON_RUNTIME_CONTROL]", JSON.stringify(rows, null, 2));
      expect(rows).toHaveLength(WEAPONS.length);
      expect(rows.every((row) => row.totalDps > 0)).toBe(true);
    } finally {
      DamageManager.prototype.processDamage = originalProcessDamage;
      CombatRuntime.prototype.useWeaponAbility = originalUseWeaponAbility;
    }
  });
});
