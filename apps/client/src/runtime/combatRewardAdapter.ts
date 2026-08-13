import type { EntityId } from "@game/core";
import type { CombatService, StatsManager} from "@game/gameplay";
import { getEncounterRewards } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";
import type { CombatRewardRuntime } from "./CombatRewardRuntime.js";
import type { WorldRuntime } from "./WorldRuntime.js";
import { getMasteryDisplayName } from "../data/progressionContentCatalog.js";
import { ENCHANTMENT_MATERIAL_NAMES } from "../data/economyContentCatalog.js";
import { getMonsterDefinition } from "../data/monsterContentCatalog.js";
import { getWorldZonePlacement } from "../data/worldContentCatalog.js";
import {
  clearActiveMonsterIdentity,
  getMonsterDefinitionIdForEntity,
} from "./activeMonsterIdentity.js";
import { syncStatsToBridge } from "../state/bridgeSync.js";

export interface CombatRewardAdapterOptions {
  readonly combatService: CombatService;
  readonly combatRewardRuntime: CombatRewardRuntime;
  readonly worldRuntime: WorldRuntime;
  readonly bridge: GameBridge;
  readonly statsManager: StatsManager;
  readonly heroId: EntityId;
  readonly recalculateWeaponMasteryStats: () => void;
  readonly resyncAll: () => void;
}

export interface CombatRewardAdapter {
  readonly getIncomeRate: () => number;
  readonly getLastSilver: () => number;
  readonly resetSilverBalance: (newBalance: number) => void;
  readonly dispose: () => void;
}

const FACTION_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  animal: "Animal",
  generic: "Générique",
  heretic: "Hérétique",
  keeper: "Keeper",
  morgana: "Morgana",
  undead: "Mort-vivant",
};

function formatFactionName(factionId: string): string {
  return FACTION_DISPLAY_NAMES[factionId]
    ?? factionId
      .split("_")
      .filter((part) => part.length > 0)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
}

function formatDropName(itemId: string): string {
  const enchantmentName = ENCHANTMENT_MATERIAL_NAMES[itemId];
  if (enchantmentName !== undefined) return enchantmentName;

  const factionPrefixes = [
    "item_resource_artifact_fragment_",
    "item_resource_artifact_",
    "item_resource_dungeon_key_",
    "item_resource_key_fragment_",
  ] as const;
  for (const prefix of factionPrefixes) {
    if (itemId.startsWith(prefix)) return formatFactionName(itemId.slice(prefix.length));
  }

  if (itemId === "item_health_potion") return "Potion de soin";
  return itemId.replace("item_resource_", "").replace("item_", "").replace(/_/g, " ");
}

function formatDropCategory(kind: string): string {
  if (kind === "artifact") return "Artefact";
  if (kind === "artifact_fragment") return "Fragment d’artefact";
  if (kind === "key") return "Clé de donjon";
  if (kind === "key_fragment") return "Fragment de clé";
  if (kind === "enchantment") return "Enchantement";
  if (kind === "consumable") return "Consommable";
  return "Loot";
}

export function setupCombatRewardAdapter(
  options: CombatRewardAdapterOptions,
): CombatRewardAdapter {
  let lastSilver = 1000;
  let incomeRate = 0;

  const unsubscribe = options.combatService.events.subscribe("enemyKilled", (event) => {
    options.bridge.incrementEnemiesKilled();

    const zonePlacement = getWorldZonePlacement(
      options.worldRuntime.getActiveZoneDef().defId,
    );
    const progressionRewards = getEncounterRewards(
      zonePlacement.zoneIndexWithinBand,
      options.worldRuntime.currentSegment,
      options.worldRuntime.currentEncounter,
      zonePlacement.bandId,
    );
    const monsterDefinitionId = getMonsterDefinitionIdForEntity(event.entityId);
    const monster = monsterDefinitionId === undefined
      ? undefined
      : getMonsterDefinition(monsterDefinitionId);
    const rewards = progressionRewards;

    const isFinalBoss = monster?.tags.includes("biome_boss") ?? false;
    const isBoss = isFinalBoss
      || (monster?.tags.includes("segment_boss") ?? false)
      || monster?.category === "boss";

    const rewardResult = options.combatRewardRuntime.processEnemyKilledReward(
      rewards.silver,
      rewards.fame,
      {
        segmentIndex: options.worldRuntime.currentSegment,
        faction: monster?.faction ?? "generic",
        isBoss,
        isFinalBoss,
      },
    );
    clearActiveMonsterIdentity(event.entityId);

    incomeRate = rewardResult.newBalance - lastSilver;
    lastSilver = rewardResult.newBalance;

    options.bridge.addTransaction({
      id: `loot_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
      type: "credit",
      description: `Loot: +${String(rewardResult.silverEarned)} Silver`,
      amount: rewardResult.silverEarned,
      timestamp: Date.now(),
    });
    options.bridge.addEconomyNotification({
      id: `notif_silver_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
      type: "success",
      message: `+${String(rewardResult.silverEarned)} Silver from loot`,
      timestamp: Date.now(),
    });

    if (rewardResult.fameEarned !== undefined) {
      options.recalculateWeaponMasteryStats();
      syncStatsToBridge(options.bridge, options.statsManager, options.heroId);

      const masteryName = getMasteryDisplayName(rewardResult.fameEarned.weaponId);
      options.bridge.addEconomyNotification({
        id: `notif_fame_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
        type: "success",
        message: `+${String(rewardResult.fameEarned.amount)} Fame · ${masteryName}`,
        timestamp: Date.now(),
      });
    }

    for (const drop of rewardResult.itemDrops) {
      const dropName = formatDropName(drop.itemId);
      const category = formatDropCategory(drop.kind);
      const timestamp = Date.now();

      options.bridge.addTransaction({
        id: `loot_item_${String(timestamp)}_${String(Math.random()).slice(2, 8)}`,
        type: "credit",
        description: `${category} : ${dropName}`,
        amount: 1,
        timestamp,
      });

      options.bridge.addEconomyNotification({
        id: `notif_drop_${String(timestamp)}_${String(Math.random()).slice(2, 8)}`,
        type: "success",
        message: `${category} : ${dropName}`,
        timestamp,
      });
    }

    options.resyncAll();
  });

  return {
    getIncomeRate: () => incomeRate,
    getLastSilver: () => lastSilver,
    resetSilverBalance: (newBalance: number) => {
      lastSilver = newBalance;
      incomeRate = 0;
    },
    dispose: () => {
      unsubscribe();
    },
  };
}
