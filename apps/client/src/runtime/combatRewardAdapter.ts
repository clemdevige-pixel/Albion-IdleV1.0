import type { EntityId } from "@game/core";
import { CombatService, StatsManager, getEncounterRewards } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";
import type { CombatRewardRuntime } from "./CombatRewardRuntime.js";
import type { WorldRuntime } from "./WorldRuntime.js";
import { getMasteryDisplayName } from "../data/progressionContentCatalog.js";
import { ENCHANTMENT_MATERIAL_NAMES } from "../data/economyContentCatalog.js";
import { getMonsterDefinition } from "../data/monsterContentCatalog.js";
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

export function setupCombatRewardAdapter(
  options: CombatRewardAdapterOptions,
): CombatRewardAdapter {
  let lastSilver = 1000;
  let incomeRate = 0;

  const unsubscribe = options.combatService.events.subscribe("enemyKilled", (event) => {
    options.bridge.incrementEnemiesKilled();

    const progressionRewards = getEncounterRewards(
      options.worldRuntime.currentZoneIndex,
      options.worldRuntime.currentSegment,
      options.worldRuntime.currentEncounter,
    );
    const monsterDefinitionId = getMonsterDefinitionIdForEntity(event.entityId);
    const monster = monsterDefinitionId === undefined
      ? undefined
      : getMonsterDefinition(monsterDefinitionId);

    const silverReward = Math.max(
      0,
      Math.round(progressionRewards.silver * (monster?.rewards.silverMultiplier ?? 1)),
    );
    const fameReward = Math.max(
      0,
      Math.round(progressionRewards.fame * (monster?.rewards.fameMultiplier ?? 1)),
    );
    const lootTableId = monster?.rewards.lootTableId ?? "loot_monster_generic";

    const rewardResult = options.combatRewardRuntime.processEnemyKilledReward(
      silverReward,
      fameReward,
      lootTableId,
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

    if (rewardResult.equipmentDropped !== undefined) {
      const formattedName = rewardResult.equipmentDropped.itemId
        .replace("item_", "")
        .replace(/_/g, " ");
      options.bridge.addEconomyNotification({
        id: `notif_loot_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
        type: "success",
        message: `Loot: ${formattedName}`,
        timestamp: Date.now(),
      });
    }

    if (rewardResult.enchantmentMaterialDropped !== undefined) {
      const matId = rewardResult.enchantmentMaterialDropped.itemId;
      const matName = ENCHANTMENT_MATERIAL_NAMES[matId] ?? matId;
      options.bridge.addEconomyNotification({
        id: `notif_enchantment_${String(Date.now())}_${String(Math.random()).slice(2, 8)}`,
        type: "success",
        message: `Rare : ${matName}`,
        timestamp: Date.now(),
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
