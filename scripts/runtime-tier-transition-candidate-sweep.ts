import {
  BLACK_WORLD_COMBAT_CURVE,
  BLUE_WORLD_COMBAT_CURVE,
  ORANGE_WORLD_COMBAT_CURVE,
  RED_WORLD_COMBAT_CURVE,
  YELLOW_WORLD_COMBAT_CURVE,
  type BossGateCombatProfile,
  type ZoneCombatCurve,
} from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type SourceTier = 4 | 5 | 6 | 7;
type BandId = "blue" | "yellow" | "orange" | "red" | "black";
type MutableZone = {
  healthStart: number;
  healthEnd: number;
  damageStart: number;
  damageEnd: number;
  defenseStart: number;
  defenseEnd: number;
  defenseModel: ZoneCombatCurve["defenseModel"];
  bossGate?: BossGateCombatProfile;
};

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

const TRANSITIONS: readonly {
  sourceTier: SourceTier;
  sourceBand: BandId;
  sourceCurve: readonly ZoneCombatCurve[];
  targetTier: Tier;
  targetBand: BandId;
  targetCurve: readonly ZoneCombatCurve[];
  mastery: number;
}[] = [
  { sourceTier: 4, sourceBand: "blue", sourceCurve: BLUE_WORLD_COMBAT_CURVE, targetTier: 5, targetBand: "yellow", targetCurve: YELLOW_WORLD_COMBAT_CURVE, mastery: 30 },
  { sourceTier: 5, sourceBand: "yellow", sourceCurve: YELLOW_WORLD_COMBAT_CURVE, targetTier: 6, targetBand: "orange", targetCurve: ORANGE_WORLD_COMBAT_CURVE, mastery: 35 },
  { sourceTier: 6, sourceBand: "orange", sourceCurve: ORANGE_WORLD_COMBAT_CURVE, targetTier: 7, targetBand: "red", targetCurve: RED_WORLD_COMBAT_CURVE, mastery: 50 },
  { sourceTier: 7, sourceBand: "red", sourceCurve: RED_WORLD_COMBAT_CURVE, targetTier: 8, targetBand: "black", targetCurve: BLACK_WORLD_COMBAT_CURVE, mastery: 65 },
] as const;

const BOSS_HEALTH = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1, 2.3, 2.5] as const;
const BOSS_DAMAGE = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1] as const;
const BOSS_DEFENSE = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5] as const;
const END_HEALTH = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1] as const;
const END_DAMAGE = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.1] as const;
const END_DEFENSE = [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5] as const;
const MAX_RESULTS = 8;

function weaponItemIds(tier: Tier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) => `item_weapon_${family}_t${tier}_${specialization}`);
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    "item_traveler_cape",
  ];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(`item_shield_t${tier}_reinforced`);
  return items;
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

function zoneId(band: BandId, index: number): NonNullable<(typeof WORLD_ZONE_IDS_BY_BAND)[BandId][number]> {
  const id = WORLD_ZONE_IDS_BY_BAND[band][index];
  if (id === undefined) throw new Error(`Missing zone ${band} ${index + 1}`);
  return id;
}

function bossCandidateScore(h: number, d: number, def: number): number {
  return Number(((h - 1) + (d - 1) + (def - 1)).toFixed(4));
}

function runBossSweep(transition: (typeof TRANSITIONS)[number]) {
  const zone = transition.sourceCurve[4] as MutableZone | undefined;
  if (zone === undefined) throw new Error("Missing final zone");
  const original = zone.bossGate;
  const id = zoneId(transition.sourceBand, 4);
  const valid: Array<Record<string, unknown>> = [];

  const candidates = BOSS_HEALTH.flatMap((health) =>
    BOSS_DAMAGE.flatMap((damage) =>
      BOSS_DEFENSE.map((defense) => ({ health, damage, defense, score: bossCandidateScore(health, damage, defense) })),
    ),
  ).sort((a, b) => a.score - b.score || a.health - b.health || a.damage - b.damage || a.defense - b.defense);

  try {
    for (const candidate of candidates) {
      zone.bossGate = {
        progressionRole: "boss_gate",
        healthMultiplier: candidate.health,
        damageMultiplier: candidate.damage,
        defenseMultiplier: candidate.defense,
      };

      let tN2PotionClears = 0;
      let tN3PotionClears = 0;
      let tN3NoPotionClears = 0;
      let minTn3PotionHp = 100;

      for (const weaponItemId of weaponItemIds(transition.sourceTier)) {
        const common = {
          weaponItemId,
          zoneDefId: id,
          segmentIndex: 9,
          equipmentItemIds: equipmentFor(weaponItemId, transition.sourceTier),
          masteryLevel: transition.mastery,
        } as const;
        const n2 = runCombatRuntimeBenchmark({ ...common, label: "transition_boss_n2", enchantment: 2, useHealthPotions: true });
        const n3NoPotion = runCombatRuntimeBenchmark({ ...common, label: "transition_boss_n3_no_potion", enchantment: 3, useHealthPotions: false });
        const n3Potion = runCombatRuntimeBenchmark({ ...common, label: "transition_boss_n3_potion", enchantment: 3, useHealthPotions: true });
        if (n2.clear) tN2PotionClears += 1;
        if (n3NoPotion.clear) tN3NoPotionClears += 1;
        if (n3Potion.clear) {
          tN3PotionClears += 1;
          minTn3PotionHp = Math.min(minTn3PotionHp, n3Potion.hpPercent);
        }
      }

      if (tN2PotionClears === 0 && tN3PotionClears === 5 && tN3NoPotionClears === 0) {
        valid.push({
          transition: `T${transition.sourceTier}->T${transition.targetTier}`,
          zone: zoneName(String(id)),
          ...candidate,
          tN2PotionClears,
          tN3PotionClears,
          tN3NoPotionClears,
          minTn3PotionHp,
        });
        if (valid.length >= MAX_RESULTS) break;
      }
    }
  } finally {
    zone.bossGate = original;
  }

  return valid;
}

function runPlateauSweep(transition: (typeof TRANSITIONS)[number]) {
  const zone = transition.targetCurve[0] as MutableZone | undefined;
  if (zone === undefined) throw new Error("Missing target entry zone");
  const original = {
    healthEnd: zone.healthEnd,
    damageEnd: zone.damageEnd,
    defenseEnd: zone.defenseEnd,
  };
  const id = zoneId(transition.targetBand, 0);
  const valid: Array<Record<string, unknown>> = [];

  const candidates = END_HEALTH.flatMap((healthEnd) =>
    END_DAMAGE.flatMap((damageEnd) =>
      END_DEFENSE.map((defenseEnd) => ({
        healthEnd,
        damageEnd,
        defenseEnd,
        score: bossCandidateScore(healthEnd, damageEnd, defenseEnd),
      })),
    ),
  ).sort((a, b) => a.score - b.score || a.healthEnd - b.healthEnd || a.damageEnd - b.damageEnd || a.defenseEnd - b.defenseEnd);

  try {
    for (const candidate of candidates) {
      zone.healthEnd = original.healthEnd * candidate.healthEnd;
      zone.damageEnd = original.damageEnd * candidate.damageEnd;
      zone.defenseEnd = original.defenseEnd * candidate.defenseEnd;

      let s1ToS3NoPotionPasses = 0;
      let s10PotionClears = 0;
      let earliestWall = 11;

      for (const weaponItemId of weaponItemIds(transition.sourceTier)) {
        const common = {
          weaponItemId,
          zoneDefId: id,
          equipmentItemIds: equipmentFor(weaponItemId, transition.sourceTier),
          masteryLevel: transition.mastery,
          enchantment: 3 as const,
        };
        let clearsFirstThree = true;
        for (let segmentIndex = 0; segmentIndex < 3; segmentIndex += 1) {
          const result = runCombatRuntimeBenchmark({ ...common, label: "transition_plateau_early", segmentIndex, useHealthPotions: false });
          if (!result.clear) clearsFirstThree = false;
        }
        if (clearsFirstThree) s1ToS3NoPotionPasses += 1;

        const s10 = runCombatRuntimeBenchmark({ ...common, label: "transition_plateau_s10", segmentIndex: 9, useHealthPotions: true });
        if (s10.clear) s10PotionClears += 1;

        for (let segmentIndex = 3; segmentIndex < 10; segmentIndex += 1) {
          const result = runCombatRuntimeBenchmark({ ...common, label: "transition_plateau_wall", segmentIndex, useHealthPotions: false });
          if (!result.clear) {
            earliestWall = Math.min(earliestWall, segmentIndex + 1);
            break;
          }
        }
      }

      if (s1ToS3NoPotionPasses === 5 && s10PotionClears === 0) {
        valid.push({
          transition: `T${transition.sourceTier}->T${transition.targetTier}`,
          zone: zoneName(String(id)),
          ...candidate,
          s1ToS3NoPotionPasses,
          s10PotionClears,
          earliestNoPotionWall: earliestWall === 11 ? "-" : `S${earliestWall}`,
        });
        if (valid.length >= MAX_RESULTS) break;
      }
    }
  } finally {
    zone.healthEnd = original.healthEnd;
    zone.damageEnd = original.damageEnd;
    zone.defenseEnd = original.defenseEnd;
  }

  return valid;
}

const summary: Array<Record<string, unknown>> = [];
for (const transition of TRANSITIONS) {
  const boss = runBossSweep(transition);
  const plateau = runPlateauSweep(transition);
  const label = `T${transition.sourceTier}_T${transition.targetTier}`;
  console.log(`[${label}_BOSS_GATE_CANDIDATES]`);
  console.table(boss);
  console.log(`[${label}_BOSS_GATE_CANDIDATES_JSON]`, JSON.stringify(boss, null, 2));
  console.log(`[${label}_PLATEAU_CANDIDATES]`);
  console.table(plateau);
  console.log(`[${label}_PLATEAU_CANDIDATES_JSON]`, JSON.stringify(plateau, null, 2));
  summary.push({
    transition: `T${transition.sourceTier}->T${transition.targetTier}`,
    bossCandidate: boss[0] ?? null,
    plateauCandidate: plateau[0] ?? null,
  });
}

console.log("[TIER_TRANSITION_BEST_CANDIDATES_JSON]", JSON.stringify(summary, null, 2));
console.log("[TIER_TRANSITION_SWEEP_CONTRACT]", {
  finalGate: "Tn.2 + potion = 0/5; Tn.3 + potion = 5/5; Tn.3 without potion = 0/5 on final S10",
  farmPlateau: "Tn.3 without potion clears S1-S3 for 5/5 weapons; Tn.3 + potion clears S10 for 0/5",
  plateauMethod: "Preserve Z1 start values and scale only Z1 end values.",
});
