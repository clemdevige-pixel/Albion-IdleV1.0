import { useGameBridge, useGameServices } from "../state/GameContext";
import {
  getEnchantmentFrameClass,
  getItemDefinition,
  getItemDisplayName,
  ItemVisual,
} from "./ItemVisual";
import {
  getEnchantmentItemPowerBonus,
  getEnchantmentStatMultiplier,
  type AwakenedTraitId,
  type EnchantmentLevel,
  type ItemInstanceId,
} from "@game/gameplay";
import {
  getEffectiveItemPower,
  getItemPower,
  getMasteryDamageMultiplier,
  getMasteryItemPowerBonus,
  getWeaponAttackSpeed,
} from "../data/itemPower";
import { resolveEquipmentInfo } from "../data/itemContentCatalog";
import { getRelicDefinitionByInventoryItemId } from "../data/relicContentCatalog";

const SLOT_LABELS: Readonly<Record<string, string>> = {
  head: "Tête", chest: "Torse", boots: "Bottes", weapon: "Arme", off_hand: "Main gauche", cape: "Cape",
};

const STAT_LABELS: Readonly<Record<string, string>> = {
  stat_physical_damage: "Dégâts physiques",
  stat_magical_damage: "Dégâts magiques",
  stat_attack_speed: "Vitesse d'attaque",
  stat_armor: "Armure",
  stat_magic_resistance: "Résistance magique",
  stat_max_health: "Santé maximale",
};

const AWAKENED_TRAIT_LABELS: Readonly<Record<AwakenedTraitId, string>> = {
  item_power: "Item Power",
  auto_attack_damage: "Dégâts d’auto-attaques",
  ability_power: "Puissance des compétences",
  cooldown_reduction: "Réduction des temps de recharge",
  max_health: "Points de vie",
  defense: "Défense",
  life_steal: "Vol de vie",
  fame_bonus: "Bonus de Fame",
};

function formatStatValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function formatAwakenedTraitValue(traitId: AwakenedTraitId, value: number): string {
  if (traitId === "item_power") return `+${formatStatValue(value)} IP`;
  if (
    traitId === "auto_attack_damage"
    || traitId === "ability_power"
    || traitId === "cooldown_reduction"
    || traitId === "life_steal"
    || traitId === "fame_bonus"
  ) {
    return `+${formatStatValue(value)}%`;
  }
  return `+${formatStatValue(value)}`;
}

export interface ItemTooltipProps {
  readonly itemId: string;
  readonly quantity: number;
  readonly instanceId: string | undefined;
  readonly enchantmentOverride?: EnchantmentLevel | undefined;
}

export function ItemTooltip({
  itemId,
  quantity,
  instanceId,
  enchantmentOverride,
}: ItemTooltipProps): JSX.Element {
  const state = useGameBridge();
  const services = useGameServices();
  const persistedEnchantment = instanceId === undefined
    ? 0
    : state.inventory.slots.find((slot) => slot.instanceId === instanceId)?.enchantment
      ?? state.equipment.slots.find((slot) => slot.instanceId === instanceId)?.enchantment
      ?? 0;
  const enchantment = enchantmentOverride ?? persistedEnchantment;
  const definition = getItemDefinition(itemId);
  const effectiveDefinition = resolveEquipmentInfo(itemId) ?? definition;
  const relicDefinition = getRelicDefinitionByInventoryItemId(itemId);
  const relicProgress = relicDefinition === undefined
    ? undefined
    : services.getRelicProgress(relicDefinition.id);
  const itemPower = getItemPower(itemId);
  const masteryItemPowerBonus = getMasteryItemPowerBonus(
    itemId,
    state.progression.masteries,
  );
  const effectiveItemPower = getEffectiveItemPower(
    itemId,
    state.progression.masteries,
    enchantment,
  );
  const enchantmentItemPowerBonus = getEnchantmentItemPowerBonus(enchantment);
  const enchantmentStatMultiplier = getEnchantmentStatMultiplier(enchantment);
  const masteryDamageMultiplier = getMasteryDamageMultiplier(
    itemId,
    state.progression.masteries,
  );
  const equipped = definition === undefined
    ? undefined
    : state.equipment.slots.find((slot) => slot.slot === definition.slot);
  const equippedDefinition = equipped?.itemId === undefined ? undefined : getItemDefinition(equipped.itemId);
  const equippedEffectiveDefinition = equipped?.itemId === undefined
    ? undefined
    : resolveEquipmentInfo(equipped.itemId) ?? equippedDefinition;
  const equippedEnchantment = equipped?.enchantment ?? 0;
  const equippedEnchantmentStatMultiplier = getEnchantmentStatMultiplier(equippedEnchantment);
  const equippedMasteryDamageMultiplier = equipped?.itemId === undefined
    ? 1
    : getMasteryDamageMultiplier(equipped.itemId, state.progression.masteries);
  const attackSpeed = getWeaponAttackSpeed(itemId);
  const equippedAttackSpeed = equipped?.itemId === undefined
    ? undefined
    : getWeaponAttackSpeed(equipped.itemId);
  const durability = instanceId === undefined
    ? undefined
    : state.repair.items.find((item) => item.instanceId === instanceId);
  const awakenedState = enchantment === 4
    && definition?.slot === "weapon"
    && instanceId !== undefined
    ? services.awakenedWeaponService.getState(instanceId as ItemInstanceId)
    : undefined;
  const awakenedTraits = awakenedState?.awakened === true
    ? awakenedState.traits.map((trait) => ({
      traitId: trait.traitId,
      value: services.awakenedWeaponService.getDisplayTraitValue(trait.traitId, trait.value),
    }))
    : [];
  const consumableDescription = itemId === "item_health_potion"
    ? `Restaure ${String(state.consumables.healthPotionHealPercent)}% des PV maximum. Recharge : ${String(state.consumables.healthPotionCooldown)} s.`
    : undefined;

  return (
    <div className={`item-tooltip${getEnchantmentFrameClass(enchantment)}`}>
      <div className="item-tooltip__header">
        <div className="item-tooltip__preview"><ItemVisual itemId={itemId} /></div>
        <div>
          <div className="item-tooltip__name">
            {getItemDisplayName(itemId)}{enchantment > 0 ? ` .${String(enchantment)}` : ""}
          </div>
          {definition !== undefined && (
            <div className="item-tooltip__meta">
              Tier {String(definition.tier)} · {SLOT_LABELS[definition.slot]}
              {definition.handling !== undefined ? ` · ${definition.handling === "two_handed" ? "Deux mains" : "Une main"}` : ""}
            </div>
          )}
        </div>
      </div>

      {relicProgress !== undefined && (
        <div className="item-tooltip__stats">
          <div>
            <span>État</span>
            <strong>
              {relicProgress.state === "broken"
                ? "Brisée"
                : relicProgress.state === "charged"
                  ? "Chargée"
                  : relicProgress.state === "examined"
                    ? "Examinée"
                    : "Non obtenue"}
            </strong>
          </div>
          {(relicProgress.state === "broken" || relicProgress.state === "charged") && (
            <div>
              <span>Charge</span>
              <strong>{String(relicProgress.chargeKills)} / {String(relicProgress.requiredChargeKills)}</strong>
            </div>
          )}
        </div>
      )}

      {definition !== undefined && (
        <div className="item-tooltip__stats">
          {itemPower !== undefined && (
            <>
              <div>
                <span>Puissance d’objet</span>
                <strong>{formatStatValue(itemPower)} IP</strong>
              </div>
              {masteryItemPowerBonus > 0 && (
                <div>
                  <span>Bonus de maîtrise</span>
                  <strong>+{formatStatValue(masteryItemPowerBonus)} IP</strong>
                </div>
              )}
              {enchantmentItemPowerBonus > 0 && (
                <div>
                  <span>Bonus d’enchantement</span>
                  <strong>+{formatStatValue(enchantmentItemPowerBonus)} IP</strong>
                </div>
              )}
              <div>
                <span>Puissance totale</span>
                <strong>{formatStatValue(effectiveItemPower ?? itemPower)} IP</strong>
              </div>
            </>
          )}
          {Object.entries(effectiveDefinition?.stats ?? definition.stats)
            .filter(([statId]) => statId !== "stat_attack_speed")
            .map(([statId, value]) => {
              const effectiveValue = getEffectiveEquipmentStat(
                statId,
                value,
                enchantmentStatMultiplier,
                masteryDamageMultiplier,
              );
              const authoredBaseValue = definition.stats[statId] ?? value;
              const ipBonus = effectiveValue - authoredBaseValue;
              const equippedBaseValue = equippedEffectiveDefinition?.stats?.[statId] ?? 0;
              const equippedValue = getEffectiveEquipmentStat(
                statId,
                equippedBaseValue,
                equippedEnchantmentStatMultiplier,
                equippedMasteryDamageMultiplier,
              );
              const delta = effectiveValue - equippedValue;
              const showDelta = equippedDefinition !== undefined && equipped?.itemId !== itemId;
              return (
                <div key={statId}>
                  <span>{STAT_LABELS[statId] ?? statId}</span>
                  <strong>
                    +{formatStatValue(effectiveValue)}
                    {ipBonus > 0 && <small>(+{formatStatValue(ipBonus)} via IP/2M)</small>}
                  </strong>
                  {showDelta && (
                    <em className={delta >= 0 ? "is-positive" : "is-negative"}>
                      {delta >= 0 ? "+" : ""}{formatStatValue(delta)}
                    </em>
                  )}
                </div>
              );
            })}
          {attackSpeed !== undefined && (
            <div>
              <span>Vitesse d'attaque</span>
              <strong>{formatStatValue(attackSpeed)}/s</strong>
              {equippedAttackSpeed !== undefined
                && equipped?.itemId !== itemId
                && (
                  <em className={attackSpeed >= equippedAttackSpeed ? "is-positive" : "is-negative"}>
                    {attackSpeed >= equippedAttackSpeed ? "+" : ""}
                    {formatStatValue(attackSpeed - equippedAttackSpeed)}
                  </em>
                )}
            </div>
          )}
        </div>
      )}

      {awakenedState !== undefined && (
        <div className="item-tooltip__stats">
          <div>
            <span>Éveil .4</span>
            <strong>{awakenedState.awakened ? `Strain ${String(awakenedState.strain)}` : "Non éveillée"}</strong>
          </div>
          {awakenedTraits.map((trait) => (
            <div key={trait.traitId}>
              <span>{AWAKENED_TRAIT_LABELS[trait.traitId]}</span>
              <strong>{formatAwakenedTraitValue(trait.traitId, trait.value)}</strong>
            </div>
          ))}
        </div>
      )}

      {consumableDescription !== undefined && (
        <p className="item-tooltip__description">{consumableDescription}</p>
      )}

      {durability !== undefined && (
        <div className="item-tooltip__durability">
          Durabilité : {String(durability.currentDurability)} / {String(durability.maxDurability)}
        </div>
      )}
      {quantity > 1 && <div className="item-tooltip__quantity">Quantité : {String(quantity)}</div>}
      {definition !== undefined && (
        <div className="item-tooltip__hint">Clic droit pour les actions</div>
      )}
    </div>
  );
}

function getEffectiveEquipmentStat(
  statId: string,
  baseValue: number,
  enchantmentMultiplier: number,
  masteryDamageMultiplier: number,
): number {
  const enchantmentValue = baseValue * enchantmentMultiplier;
  const isWeaponDamage = statId === "stat_physical_damage" || statId === "stat_magical_damage";
  return enchantmentValue + (isWeaponDamage ? baseValue * (masteryDamageMultiplier - 1) : 0);
}
