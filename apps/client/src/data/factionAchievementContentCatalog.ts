import { MONSTER_IDS } from "./monsterContentCatalog.js";

export type FactionAchievementCondition =
  | { readonly type: "faction_unit_discovery"; readonly monsterIds: readonly string[] }
  | { readonly type: "faction_kill_count"; readonly factionId: string; readonly minimum: number }
  | { readonly type: "faction_elite_kill_count"; readonly factionId: string; readonly minimum: number }
  | { readonly type: "faction_relic_reconstructed"; readonly relicId: string }
  | { readonly type: "faction_expedition_completed_count"; readonly factionId: string; readonly minimum: number }
  | { readonly type: "faction_dungeon_completed_count"; readonly factionId: string; readonly minimum: number }
  | { readonly type: "faction_mastery_level"; readonly factionId: string; readonly minimum: number }
  | { readonly type: "expedition_completed_count"; readonly minimum: number }
  | { readonly type: "silver_expedition_completed_count"; readonly minimum: number }
  | { readonly type: "silver_expedition_lifetime_silver"; readonly minimum: number };

export interface FactionAchievementDefinition {
  readonly id: string;
  readonly group: "faction" | "expedition";
  readonly factionId?: string;
  readonly title: string;
  readonly condition: FactionAchievementCondition;
}

const FACTIONS = [
  {
    id: "keeper",
    label: "Keeper",
    normalMonsterIds: [MONSTER_IDS.keeperWarrior, MONSTER_IDS.keeperShaman],
  },
  {
    id: "heretic",
    label: "Heretic",
    normalMonsterIds: [MONSTER_IDS.hereticThug, MONSTER_IDS.hereticFirestarter],
  },
  {
    id: "undead",
    label: "Undead",
    normalMonsterIds: [MONSTER_IDS.undeadSkeletonSwordsman, MONSTER_IDS.undeadSkeletonArcher],
  },
  {
    id: "morgana",
    label: "Morgana",
    normalMonsterIds: [MONSTER_IDS.morganaWitch, MONSTER_IDS.morganaSuppressor],
  },
] as const;

function createFactionAchievements(
  faction: (typeof FACTIONS)[number],
): readonly FactionAchievementDefinition[] {
  const base = {
    group: "faction" as const,
    factionId: faction.id,
  };
  return [
    {
      ...base,
      id: `${faction.id}_discovery`,
      title: `Discovery · ${faction.label}`,
      condition: {
        type: "faction_unit_discovery",
        monsterIds: faction.normalMonsterIds,
      },
    },
    ...([25, 100, 500] as const).map((minimum, index) => ({
      ...base,
      id: `${faction.id}_hunter_${String(index + 1)}`,
      title: `Hunter ${["I", "II", "III"][index] ?? String(index + 1)} · ${faction.label}`,
      condition: { type: "faction_kill_count" as const, factionId: faction.id, minimum },
    })),
    {
      ...base,
      id: `${faction.id}_elite_hunter`,
      title: `Elite Hunter · ${faction.label}`,
      condition: { type: "faction_elite_kill_count", factionId: faction.id, minimum: 3 },
    },
    {
      ...base,
      id: `${faction.id}_veteran_hunter`,
      title: `Veteran Hunter · ${faction.label}`,
      condition: { type: "faction_elite_kill_count", factionId: faction.id, minimum: 25 },
    },
    {
      ...base,
      id: `${faction.id}_relic_reconstructed`,
      title: `Relic Reconstructed · ${faction.label}`,
      condition: { type: "faction_relic_reconstructed", relicId: `relic_${faction.id}` },
    },
    {
      ...base,
      id: `${faction.id}_explorer`,
      title: `Explorer · ${faction.label}`,
      condition: { type: "faction_expedition_completed_count", factionId: faction.id, minimum: 1 },
    },
    {
      ...base,
      id: `${faction.id}_expeditionary`,
      title: `Expeditionary · ${faction.label}`,
      condition: { type: "faction_expedition_completed_count", factionId: faction.id, minimum: 10 },
    },
    {
      ...base,
      id: `${faction.id}_conqueror`,
      title: `Conqueror · ${faction.label}`,
      condition: { type: "faction_dungeon_completed_count", factionId: faction.id, minimum: 1 },
    },
    {
      ...base,
      id: `${faction.id}_veteran_conqueror`,
      title: `Veteran Conqueror · ${faction.label}`,
      condition: { type: "faction_dungeon_completed_count", factionId: faction.id, minimum: 10 },
    },
    ...([25, 50, 75, 100] as const).map((minimum, index) => ({
      ...base,
      id: `${faction.id}_mastery_${String(index + 1)}`,
      title: `Mastery ${["I", "II", "III", "IV"][index] ?? String(index + 1)} · ${faction.label}`,
      condition: { type: "faction_mastery_level" as const, factionId: faction.id, minimum },
    })),
  ];
}

export const FACTION_ACHIEVEMENT_DEFINITIONS: readonly FactionAchievementDefinition[] = [
  ...FACTIONS.flatMap((faction) => createFactionAchievements(faction)),
  {
    id: "expedition_first",
    group: "expedition",
    title: "First Expedition",
    condition: { type: "expedition_completed_count", minimum: 1 },
  },
  {
    id: "expedition_regular",
    group: "expedition",
    title: "Regular Expeditionary",
    condition: { type: "expedition_completed_count", minimum: 10 },
  },
  {
    id: "expedition_veteran",
    group: "expedition",
    title: "Veteran Expeditionary",
    condition: { type: "expedition_completed_count", minimum: 50 },
  },
  {
    id: "expedition_first_silver",
    group: "expedition",
    title: "First Silver Expedition",
    condition: { type: "silver_expedition_completed_count", minimum: 1 },
  },
  {
    id: "expedition_fortune",
    group: "expedition",
    title: "Expedition Fortune",
    condition: { type: "silver_expedition_lifetime_silver", minimum: 1_000_000 },
  },
];

export const FACTION_ACHIEVEMENT_FACTIONS = FACTIONS.map(({ id, label }) => ({ id, label }));
