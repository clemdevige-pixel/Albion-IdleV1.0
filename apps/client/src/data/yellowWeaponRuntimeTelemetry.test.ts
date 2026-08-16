import { describe, expect, it } from "vitest";
import { DamageManager, type DamageRequest, type DamageResult } from "@game/gameplay";
import { CombatRuntime } from "../runtime/CombatRuntime.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveUnlockedWeaponAbilities } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS = [
  "item_weapon_bow_t5_longbow",
  "item_weapon_staff_t5_infernal",
  "item_weapon_gloves_t5_spiked_gauntlets",
  "item_weapon_dagger_t5_pair",
] as const;

const ARMOR = [
  "item_helmet_t5_reinforced",
  "item_armor_t5_leather",
  "item_boots_t5_leather",
  "item_traveler_cape",
] as const;

const CASES = [
  { id: "stormwatch_m29_t5_1_potions", zone: "stormwatch" as const, mastery: 29, enchantment: 1 as const },
  { id: "ironveil_m35_t5_2_potions", zone: "ironveil" as const, mastery: 35, enchantment: 2 as const },
] as const;

type SourceType = DamageRequest["source_type"];
type DamageBucket = { hits: number; rawDamage: number; finalDamage: number; targets: Set<number> };
type SourceBuckets = Map<number, Record<SourceType, DamageBucket>>;
type AbilitySlotBuckets = Map<number, Map<number, DamageBucket>>;

function emptyBucket(): DamageBucket {
  return { hits: 0, rawDamage: 0, finalDamage: 0, targets: new Set<number>() };
}

function emptySourceBuckets(): Record<SourceType, DamageBucket> {
  return {
    auto_attack: emptyBucket(),
    ability: emptyBucket(),
    effect: emptyBucket(),
    other: emptyBucket(),
  };
}

function summarizePlayerSource(sourceBuckets: SourceBuckets) {
  const ranked = [...sourceBuckets.entries()].map(([source, buckets]) => {
    const targets = new Set<number>();
    for (const bucket of Object.values(buckets)) for (const target of bucket.targets) targets.add(target);
    return { source, buckets, distinctTargets: targets.size };
  }).sort((a, b) => b.distinctTargets - a.distinctTargets);
  return ranked[0];
}

function round(value: number): number {
  return Number(value.toFixed(1));
}

function dps(damage: number, seconds: number): number {
  return Number((damage / Math.max(0.001, seconds)).toFixed(2));
}

describe("Yellow weapon runtime telemetry", () => {
  it("splits actual outgoing DPS into AA / Q / W / ultimate on Yellow S10", () => {
    const originalProcessDamage = DamageManager.prototype.processDamage;
    const originalUseWeaponAbility = CombatRuntime.prototype.useWeaponAbility;
    let activeSources: SourceBuckets | undefined;
    let activeSlotBuckets: AbilitySlotBuckets | undefined;
    let activeCasts: number[] | undefined;
    let activeAbilitySlot: number | undefined;

    DamageManager.prototype.processDamage = function patchedProcessDamage(request: DamageRequest): DamageResult | null {
      const result = originalProcessDamage.call(this, request);
      if (activeSources !== undefined && result !== null) {
        const source = Number(request.source);
        let buckets = activeSources.get(source);
        if (buckets === undefined) {
          buckets = emptySourceBuckets();
          activeSources.set(source, buckets);
        }
        const bucket = buckets[request.source_type];
        bucket.hits += 1;
        bucket.rawDamage += result.rawDamage;
        bucket.finalDamage += result.finalDamage;
        bucket.targets.add(Number(request.target));

        if (request.source_type === "ability" && activeAbilitySlot !== undefined && activeSlotBuckets !== undefined) {
          let bySlot = activeSlotBuckets.get(source);
          if (bySlot === undefined) {
            bySlot = new Map();
            activeSlotBuckets.set(source, bySlot);
          }
          let slotBucket = bySlot.get(activeAbilitySlot);
          if (slotBucket === undefined) {
            slotBucket = emptyBucket();
            bySlot.set(activeAbilitySlot, slotBucket);
          }
          slotBucket.hits += 1;
          slotBucket.rawDamage += result.rawDamage;
          slotBucket.finalDamage += result.finalDamage;
          slotBucket.targets.add(Number(request.target));
        }
      }
      return result;
    };

    CombatRuntime.prototype.useWeaponAbility = function patchedUseWeaponAbility(slotIndex: number): boolean {
      activeAbilitySlot = slotIndex;
      try {
        const used = originalUseWeaponAbility.call(this, slotIndex);
        if (used && activeCasts !== undefined) activeCasts[slotIndex] = (activeCasts[slotIndex] ?? 0) + 1;
        return used;
      } finally {
        activeAbilitySlot = undefined;
      }
    };

    try {
      const rows = CASES.flatMap((probe) => WEAPONS.map((weaponItemId) => {
        activeSources = new Map();
        activeSlotBuckets = new Map();
        activeCasts = [];
        const result = runCombatRuntimeBenchmark({
          label: probe.id,
          weaponItemId,
          zoneDefId: WORLD_ZONE_IDS[probe.zone],
          segmentIndex: 9,
          equipmentItemIds: ARMOR,
          masteryLevel: probe.mastery,
          enchantment: probe.enchantment,
          useHealthPotions: true,
        });
        const player = summarizePlayerSource(activeSources);
        if (player === undefined) throw new Error(`No outgoing damage source captured for ${weaponItemId}`);
        const abilities = resolveUnlockedWeaponAbilities(weaponItemId, probe.mastery);
        const bySlot = activeSlotBuckets.get(player.source) ?? new Map<number, DamageBucket>();
        const slots = abilities.map((ability, slot) => {
          const bucket = bySlot.get(slot) ?? emptyBucket();
          const damage = round(bucket.finalDamage);
          return {
            key: slot === 0 ? "Q" : slot === 1 ? "W" : "ULT",
            abilityId: ability.id,
            slot,
            casts: activeCasts?.[slot] ?? 0,
            hits: bucket.hits,
            damage,
            damagePerCast: round(bucket.finalDamage / Math.max(1, activeCasts?.[slot] ?? 0)),
            dps: dps(bucket.finalDamage, result.seconds),
          };
        });
        const auto = player.buckets.auto_attack;
        const ability = player.buckets.ability;
        const effect = player.buckets.effect;
        const totalFinalDamage = auto.finalDamage + ability.finalDamage + effect.finalDamage + player.buckets.other.finalDamage;
        const q = slots[0];
        const w = slots[1];
        const ult = slots[2];
        return {
          checkpoint: probe.id,
          weapon: weaponItemId.replace("item_weapon_", "").replace("_t5_", " "),
          clear: result.clear,
          seconds: result.seconds,
          hpPercent: result.hpPercent,
          encounters: result.encounterReached,
          potions: result.potionsUsed,
          playerSource: player.source,
          distinctTargets: player.distinctTargets,
          actualDps: dps(totalFinalDamage, result.seconds),
          aaHits: auto.hits,
          aaDamage: round(auto.finalDamage),
          aaDps: dps(auto.finalDamage, result.seconds),
          q: q ?? null,
          w: w ?? null,
          ult: ult ?? null,
          effectHits: effect.hits,
          effectDamage: round(effect.finalDamage),
          effectDps: dps(effect.finalDamage, result.seconds),
          directAbilityDamage: round(ability.finalDamage),
          totalDamage: round(totalFinalDamage),
          slots,
        };
      }));

      console.table(rows.map(({ checkpoint, weapon, clear, actualDps, aaDps, q, w, ult, effectDps }) => ({
        checkpoint,
        weapon,
        clear,
        totalDps: actualDps,
        aaDps,
        qDps: q?.dps ?? 0,
        wDps: w?.dps ?? 0,
        ultDps: ult?.dps ?? 0,
        effectDps,
      })));
      console.log("[YELLOW_WEAPON_RUNTIME_SLOT_DPS]", JSON.stringify(rows, null, 2));

      expect(rows).toHaveLength(CASES.length * WEAPONS.length);
      expect(rows.every((row) => row.distinctTargets >= 1)).toBe(true);
      expect(rows.every((row) => row.actualDps > 0)).toBe(true);
      // Diagnostic consistency only: tolerate independent display rounding of slot totals.
      expect(rows.every((row) => Math.abs(row.slots.reduce((sum, slot) => sum + slot.damage, 0) - row.directAbilityDamage) <= 0.2)).toBe(true);
    } finally {
      DamageManager.prototype.processDamage = originalProcessDamage;
      CombatRuntime.prototype.useWeaponAbility = originalUseWeaponAbility;
    }
  });
});
