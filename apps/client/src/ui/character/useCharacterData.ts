import { useGameUiSelector } from "../state/useGameUiSelector";
import { selectCharacter, type CharacterModel } from "./characterModels";

export function useCharacterData(): CharacterModel {
  return useGameUiSelector(selectCharacter, (previous, next) =>
    previous.itemPower === next.itemPower
    && previous.stats.health === next.stats.health
    && previous.stats.maxHealth === next.stats.maxHealth
    && previous.stats.physicalDamage === next.stats.physicalDamage
    && previous.stats.magicalDamage === next.stats.magicalDamage
    && previous.stats.armor === next.stats.armor
    && previous.stats.magicResistance === next.stats.magicResistance
    && previous.equipment === next.equipment
    && previous.inventory === next.inventory
    && previous.bank === next.bank,
  );
}
