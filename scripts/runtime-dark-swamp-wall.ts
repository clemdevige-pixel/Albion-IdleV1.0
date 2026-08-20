import { createDefaultStatRegistry, type StatId } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";

const REQUIRED_GAMEPLAY_STAT = "stat_auto_attack_damage_taken_bonus" as StatId;
if (!createDefaultStatRegistry().has(REQUIRED_GAMEPLAY_STAT)) {
  throw new Error(
    `Gameplay dist is stale: missing ${String(REQUIRED_GAMEPLAY_STAT)}. Run "pnpm.cmd --filter gameplay build" before this benchmark.`,
  );
}

const T3_WEAPONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

const T3_SHIELD = "item_shield_t3_reinforced";
const T3_HEAD = "item_iron_helmet";
const T3_CHEST = "item_leather_armor";
const T3_BOOTS = "item_leather_boots";
const T3_CAPE = "item_traveler_cape";

type SetupId = "weapon_only" | "one_piece" | "two_piece" | "full_t3";

interface Setup {
  readonly id: SetupId;
  readonly label: string;
  readonly masteryLevel: number;
  readonly equipment: readonly string[];
}

const SETUPS: readonly Setup[] = [
  { id: "weapon_only", label: "Arme seule", masteryLevel: 1, equipment: [] },
  { id: "one_piece", label: "+ 1 pièce T3", masteryLevel: 4, equipment: [T3_CHEST] },
  { id: "two_piece", label: "+ 2 pièces T3", masteryLevel: 7, equipment: [T3_CHEST, T3_HEAD] },
  { id: "full_t3", label: "Full T3", masteryLevel: 10, equipment: [T3_HEAD, T3_CHEST, T3_BOOTS, T3_CAPE] },
];

function shortWeaponName(itemId: string): string {
  return itemId
    .replace("item_weapon_", "")
    .replace("_t3_", " ");
}

function equipmentFor(weaponItemId: string, setup: Setup): readonly string[] {
  const items = [...setup.equipment];
  if (setup.id === "full_t3" && resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(T3_SHIELD);
  }
  return items;
}

interface SegmentRow {
  readonly weapon: string;
  readonly setup: string;
  readonly mastery: number;
  readonly segment: number;
  readonly clear: boolean;
  readonly hpPercent: number;
  readonly seconds: number;
  readonly encounters: number;
}

const rows: SegmentRow[] = [];

for (const weaponItemId of T3_WEAPONS) {
  for (const setup of SETUPS) {
    for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
      const result = runCombatRuntimeBenchmark({
        label: `dark_swamp_${setup.id}_s${String(segmentIndex + 1)}`,
        weaponItemId,
        zoneDefId: WORLD_ZONE_IDS.swamp,
        segmentIndex,
        masteryLevel: setup.masteryLevel,
        equipmentItemIds: equipmentFor(weaponItemId, setup),
        useHealthPotions: false,
      });

      rows.push({
        weapon: shortWeaponName(weaponItemId),
        setup: setup.label,
        mastery: result.masteryLevel,
        segment: segmentIndex + 1,
        clear: result.clear,
        hpPercent: result.hpPercent,
        seconds: result.seconds,
        encounters: result.encounterReached,
      });
    }
  }
}

const summary = T3_WEAPONS.flatMap((weaponItemId) => SETUPS.map((setup) => {
  const weapon = shortWeaponName(weaponItemId);
  const setupRows = rows.filter((row) => row.weapon === weapon && row.setup === setup.label);
  const clears = setupRows.filter((row) => row.clear);
  const lastClear = clears.length === 0 ? 0 : Math.max(...clears.map((row) => row.segment));
  const firstWall = setupRows.find((row) => !row.clear)?.segment ?? null;
  const s10 = setupRows.find((row) => row.segment === 10);
  return {
    weapon,
    setup: setup.label,
    mastery: setup.masteryLevel,
    lastClear,
    firstWall: firstWall ?? "none",
    s10Clear: s10?.clear ?? false,
    s10Hp: s10?.hpPercent ?? 0,
    s10Seconds: s10?.seconds ?? 0,
  };
}));

const fullT3 = SETUPS.find((setup) => setup.id === "full_t3");
if (fullT3 === undefined) throw new Error("Missing full T3 setup");

let daggerPotionEncounters: readonly ReturnType<typeof runCombatRuntimeBenchmark>["encounters"] = [];
const potionS10 = T3_WEAPONS.map((weaponItemId) => {
  const result = runCombatRuntimeBenchmark({
    label: "dark_swamp_full_t3_s10_potion",
    weaponItemId,
    zoneDefId: WORLD_ZONE_IDS.swamp,
    segmentIndex: 9,
    masteryLevel: fullT3.masteryLevel,
    equipmentItemIds: equipmentFor(weaponItemId, fullT3),
    useHealthPotions: true,
  });

  if (weaponItemId === "item_weapon_dagger_t3_pair") {
    daggerPotionEncounters = result.encounters;
  }

  return {
    weapon: shortWeaponName(weaponItemId),
    clear: result.clear,
    hpPercent: result.hpPercent,
    seconds: result.seconds,
    encounters: result.encounterReached,
    potionsUsed: result.potionsUsed,
  };
});

console.log("\n[DARK_SWAMP_WALL_SUMMARY]");
console.table(summary);

console.log("\n[DARK_SWAMP_S10_POTION]");
console.table(potionS10);

console.log("\n[DARK_SWAMP_DAGGER_S10_POTION_ENCOUNTERS]");
console.table(daggerPotionEncounters.map((encounter) => ({
  encounter: encounter.encounterIndex,
  clear: encounter.cleared,
  seconds: encounter.seconds,
  hpBefore: encounter.hpBeforePercent,
  hpAfter: encounter.hpAfterPercent,
  potions: encounter.potionsUsed,
  damageDealt: encounter.damageDealt,
  damageReceived: encounter.damageReceived,
  autoAttackDamage: encounter.damageBySource.autoAttack,
  abilityDamage: encounter.damageBySource.ability,
  effectDamage: encounter.damageBySource.effect,
})));

console.log("\n[DARK_SWAMP_SEGMENT_DETAILS]");
console.table(rows);

console.log("\n[DARK_SWAMP_WALL_JSON]");
console.log(JSON.stringify({ summary, potionS10, daggerPotionEncounters, rows }, null, 2));
