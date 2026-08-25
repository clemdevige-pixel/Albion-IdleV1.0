import { useMemo } from "react";
import type {
  ActiveEffectDisplay,
  CombatAbilityVM,
  DamageNumberEvent,
  EconomyNotificationVM,
  GameBridgeState,
} from "../../game/GameBridge";
import { useGameServices } from "../../state/GameContext";
import { shallowEqual, useGameUiSelector } from "../state";

const HEALTH_POTION_ID = "item_health_potion";

export interface AbilityBarUiModel {
  readonly abilities: readonly [
    CombatAbilityVM | null,
    CombatAbilityVM | null,
    CombatAbilityVM | null,
  ];
  readonly potionCount: number;
  readonly potionCooldown: number;
  readonly potionCooldownRemaining: number;
  readonly potionHealPercent: number;
}

function selectAbilityBar(state: GameBridgeState): AbilityBarUiModel {
  const countPotions = (slots: GameBridgeState["inventory"]["slots"]): number => slots.reduce(
    (total, slot) => slot.itemId === HEALTH_POTION_ID ? total + slot.quantity : total,
    0,
  );
  return {
    abilities: [
      state.abilities.primary,
      state.abilities.secondary,
      state.abilities.ultimate,
    ],
    potionCount: countPotions(state.inventory.slots) + countPotions(state.bank.slots),
    potionCooldown: state.consumables.healthPotionCooldown,
    potionCooldownRemaining: state.consumables.healthPotionCooldownRemaining,
    potionHealPercent: state.consumables.healthPotionHealPercent,
  };
}

export function useAbilityBarUiModel(): AbilityBarUiModel {
  return useGameUiSelector(selectAbilityBar, shallowEqual);
}

export interface CombatStateUiModel {
  readonly combatState: GameBridgeState["combatState"];
  readonly isGathering: boolean;
}

function selectCombatState(state: GameBridgeState): CombatStateUiModel {
  return {
    combatState: state.combatState,
    isGathering: [
      state.gathering,
      state.oreGathering,
      state.hideGathering,
      state.fiberGathering,
    ].some((activity) => activity.status === "gathering"),
  };
}

export function useCombatStateUiModel(): CombatStateUiModel {
  return useGameUiSelector(selectCombatState, shallowEqual);
}

export function useActiveEffectsUiModel(): readonly ActiveEffectDisplay[] {
  return useGameUiSelector((state) => state.activeEffects);
}

export interface ActivityJournalFeed {
  readonly combatState: GameBridgeState["combatState"];
  readonly damageNumbers: readonly DamageNumberEvent[];
  readonly economyNotifications: readonly EconomyNotificationVM[];
  readonly enemiesKilled: number;
  readonly enemyName: string;
}

function selectActivityJournal(state: GameBridgeState): ActivityJournalFeed {
  return {
    combatState: state.combatState,
    damageNumbers: state.damageNumbers,
    economyNotifications: state.economyNotifications,
    enemiesKilled: state.enemiesKilled,
    enemyName: state.enemyName,
  };
}

export function useActivityJournalFeed(): ActivityJournalFeed {
  return useGameUiSelector(selectActivityJournal, shallowEqual);
}

export function useNotificationFeed(): readonly EconomyNotificationVM[] {
  return useGameUiSelector((state) => state.economyNotifications);
}

export interface CombatHudActions {
  readonly useHealthPotion: () => boolean;
  readonly useWeaponAbility: (slotIndex: number) => boolean;
  readonly setPrimaryAbilityAutoCast: (enabled: boolean) => void;
  readonly resumeExploration: () => boolean;
  readonly dismissNotification: (id: string) => void;
}

export function useCombatHudActions(): CombatHudActions {
  const services = useGameServices();

  return useMemo(
    () => ({
      useHealthPotion: () => services.useConsumable(HEALTH_POTION_ID),
      useWeaponAbility: (slotIndex: number) => (
        services.useWeaponAbility?.(slotIndex)
        ?? (slotIndex === 0 ? services.usePrimaryAbility() : false)
      ),
      setPrimaryAbilityAutoCast: services.setPrimaryAbilityAutoCast,
      resumeExploration: services.resumeExploration,
      dismissNotification: (id: string) => {
        services.bridge.dismissEconomyNotification(id);
      },
    }),
    [services],
  );
}

export { HEALTH_POTION_ID };
