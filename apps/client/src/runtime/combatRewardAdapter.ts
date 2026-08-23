import type { EntityId } from "@game/core";
import { getWorldBandDefinition } from "@game/data";
import type { CombatService, RelicKillEvent, StatsManager } from "@game/gameplay";
import { getEncounterRewards } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";
import type { CombatRewardRuntime } from "./CombatRewardRuntime.js";
import type { DungeonRewardRuntime } from "./DungeonRewardRuntime.js";
import type { WorldRuntime } from "./WorldRuntime.js";
import { getMasteryDisplayName } from "../data/progressionContentCatalog.js";
import {
  ENCHANTMENT_MATERIAL_NAMES,
  getDungeonKeyProgressionWeight,
  getEnchantmentShardProgressionWeight,
} from "../data/economyContentCatalog.js";
import { getFactionRuneWorldDropChance } from "../data/factionRuneWorldDropContentCatalog.js";
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
  readonly dungeonRewardRuntime?: DungeonRewardRuntime;
  readonly worldRuntime: WorldRuntime;
  readonly bridge: GameBridge;
  readonly statsManager: StatsManager;
  readonly heroId: EntityId;
  readonly recalculateWeaponMasteryStats: () => void;
  readonly resyncAll: () => void;
  readonly isDungeonActive?: () => boolean;
  readonly onMonsterKilled?: (kill: RelicKillEvent) => void;
}

export interface CombatRewardAdapter {
  readonly getIncomeRate: () => number;
  readonly getLastSilver: () => number;
  readonly resetSilverBalance: (newBalance: number) => void;
  readonly dispose: () => void;
}

const FACTION_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  animal: "Animal", generic: "Générique", heretic: "Hérétique", keeper: "Keeper",
  morgana: "Morgana", undead: "Mort-vivant",
};

function formatFactionName(factionId: string): string {
  return FACTION_DISPLAY_NAMES[factionId]
    ?? factionId.split("_").filter((part) => part.length > 0)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}

function formatDropName(itemId: string): string {
  const enchantmentName = ENCHANTMENT_MATERIAL_NAMES[itemId];
  if (enchantmentName !== undefined) return enchantmentName;
  const factionRuneMatch = itemId.match(/^item_resource_rune_faction_t(\d+)$/);
  if (factionRuneMatch?.[1] !== undefined) return `Rune de faction T${factionRuneMatch[1]}`;
  const factionPrefixes = [
    "item_resource_artifact_fragment_", "item_resource_artifact_",
    "item_resource_dungeon_key_", "item_resource_key_fragment_",
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
  if (kind === "faction_rune") return "Rune de faction";
  if (kind === "consumable") return "Consommable";
  return "Loot";
}

function publishDungeonDrops(
  options: CombatRewardAdapterOptions,
  drops: readonly { readonly itemId: string; readonly kind: string; readonly quantity: number }[],
): void {
  for (const drop of drops) {
    const dropName = formatDropName(drop.itemId);
    const category = formatDropCategory(drop.kind);
    const quantitySuffix = drop.quantity > 1 ? ` ×${String(drop.quantity)}` : "";
    const timestamp = Date.now();
    options.bridge.addTransaction({
      id: `loot_item_${String(timestamp)}_${String(Math.random()).slice(2, 8)}`,
      type: "credit",
      description: `${category} : ${dropName}${quantitySuffix}`,
      amount: drop.quantity,
      timestamp,
    });
    options.bridge.addEconomyNotification({
      id: `notif_drop_${String(timestamp)}_${String(Math.random()).slice(2, 8)}`,
      type: "success",
      message: `${category} : ${dropName}${quantitySuffix}`,
      timestamp,
    });
  }
}

export function setupCombatRewardAdapter(options: CombatRewardAdapterOptions): CombatRewardAdapter {
  let lastSilver = 1000;
  let incomeRate = 0;

  const unsubscribe = options.combatService.events.subscribe("enemyKilled", (event) => {
    options.bridge.incrementEnemiesKilled();
    const monsterDefinitionId = getMonsterDefinitionIdForEntity(event.entityId);

    if (options.isDungeonActive?.() === true) {
      const reward = options.dungeonRewardRuntime?.processCurrentEncounterVictory(
        (factionId) => options.combatRewardRuntime.getFactionYieldBonusPercent(factionId),
      );
      if (monsterDefinitionId !== undefined) {
        options.onMonsterKilled?.({ monsterId: monsterDefinitionId, contextId: "dungeon" });
      }
      clearActiveMonsterIdentity(event.entityId);
      if (reward !== undefined) {
        publishDungeonDrops(options, reward.drops);
        if (reward.completionSilver > 0) {
          const previousBalance = lastSilver;
          const newBalance = options.combatRewardRuntime.creditSilverReward(reward.completionSilver);
          lastSilver = newBalance;
          incomeRate = newBalance - previousBalance;
          const timestamp = Date.now();
          options.bridge.addTransaction({
            id: `dungeon_silver_${String(timestamp)}`,
            type: "credit",
            description: `Donjon terminé : +${String(reward.completionSilver)} Silver`,
            amount: reward.completionSilver,
            timestamp,
          });
          options.bridge.addEconomyNotification({
            id: `notif_dungeon_silver_${String(timestamp)}`,
            type: "success",
            message: `Donjon terminé · +${String(reward.completionSilver)} Silver`,
            timestamp,
          });
        }
      }
      options.resyncAll();
      return;
    }

    const activeZoneDef = options.worldRuntime.getActiveZoneDef();
    const zonePlacement = getWorldZonePlacement(activeZoneDef.defId);
    const progressionRewards = getEncounterRewards(
      zonePlacement.zoneIndexWithinBand,
      options.worldRuntime.currentSegment,
      options.worldRuntime.currentEncounter,
      zonePlacement.bandId,
    );
    const monster = monsterDefinitionId === undefined ? undefined : getMonsterDefinition(monsterDefinitionId);
    const isFinalBoss = monster?.tags.includes("biome_boss") ?? false;
    const isBoss = isFinalBoss || (monster?.tags.includes("segment_boss") ?? false) || monster?.category === "boss";
    const isElite = monster?.category === "elite";
    const enchantmentDropWeight = getEnchantmentShardProgressionWeight(
      zonePlacement.bandId, zonePlacement.zoneIndexWithinBand, options.worldRuntime.currentSegment,
    );
    const dungeonKeyDropWeight = getDungeonKeyProgressionWeight(
      zonePlacement.bandId, zonePlacement.zoneIndexWithinBand, options.worldRuntime.currentSegment,
    );
    const factionRuneDropChance = getFactionRuneWorldDropChance(
      zonePlacement.bandId, zonePlacement.zoneIndexWithinBand, options.worldRuntime.currentSegment,
    );
    const enchantmentTier = getWorldBandDefinition(zonePlacement.bandId).maximumTier;

    const rewardResult = options.combatRewardRuntime.processEnemyKilledReward(
      progressionRewards.silver,
      progressionRewards.fame,
      {
        segmentIndex: options.worldRuntime.currentSegment,
        faction: monster?.faction ?? "generic",
        isElite,
        isBoss,
        isFinalBoss,
        enchantmentTier,
        enchantmentDropWeight,
        dungeonKeyDropWeight,
      },
      factionRuneDropChance,
    );
    if (monsterDefinitionId !== undefined) {
      options.onMonsterKilled?.({
        monsterId: monsterDefinitionId,
        contextId: String(activeZoneDef.defId),
        segmentIndex: options.worldRuntime.currentSegment,
      });
    }
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
      const quantitySuffix = drop.quantity > 1 ? ` ×${String(drop.quantity)}` : "";
      const timestamp = Date.now();
      options.bridge.addTransaction({
        id: `loot_item_${String(timestamp)}_${String(Math.random()).slice(2, 8)}`,
        type: "credit",
        description: `${category} : ${dropName}${quantitySuffix}`,
        amount: drop.quantity,
        timestamp,
      });
      options.bridge.addEconomyNotification({
        id: `notif_drop_${String(timestamp)}_${String(Math.random()).slice(2, 8)}`,
        type: "success",
        message: `${category} : ${dropName}${quantitySuffix}`,
        timestamp,
      });
    }
    options.resyncAll();
  });

  return {
    getIncomeRate: () => incomeRate,
    getLastSilver: () => lastSilver,
    resetSilverBalance: (newBalance: number) => { lastSilver = newBalance; incomeRate = 0; },
    dispose: () => { unsubscribe(); },
  };
}
