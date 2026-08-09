import type {
  EquipmentSlotVM,
  GameBridgeState,
  InventorySlotVM,
} from "../../game/GameBridge";
import { calculateAverageEquippedItemPower } from "../state/equipmentUiSelectors";

export interface CharacterStatsModel {
  readonly health: number;
  readonly maxHealth: number;
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly armor: number;
  readonly magicResistance: number;
}

export interface CharacterModel {
  readonly itemPower: number;
  readonly stats: CharacterStatsModel;
  readonly equipment: readonly EquipmentSlotVM[];
  readonly inventory: readonly InventorySlotVM[];
}

function getComputedStat(state: GameBridgeState, id: string): number {
  return state.stats.stats.find((entry) => entry.id === id)?.computed ?? 0;
}

export function selectCharacter(state: GameBridgeState): CharacterModel {
  return {
    itemPower: calculateAverageEquippedItemPower(
      state.equipment,
      state.progression.masteries,
    ),
    stats: {
      health: state.playerHealth,
      maxHealth: state.playerMaxHealth,
      physicalDamage: getComputedStat(state, "stat_physical_damage"),
      magicalDamage: getComputedStat(state, "stat_magical_damage"),
      armor: getComputedStat(state, "stat_armor"),
      magicResistance: getComputedStat(state, "stat_magic_resistance"),
    },
    equipment: state.equipment.slots,
    inventory: state.inventory.slots,
  };
}
