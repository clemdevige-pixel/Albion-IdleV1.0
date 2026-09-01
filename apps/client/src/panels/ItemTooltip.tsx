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
import { getFactionCapeDefinition } from "../data/factionCapeContentCatalog";
import {
  getArtifactAdvantageTarget,
} from "../data/factionArtifactWeaponContent";
import {
  resolveArtifactDungeonDamageBonusPercent,
  resolveWeaponArtifactFaction,
} from "../data/weaponContentCatalog";
import { getRelicDefinitionByInventoryItemId } from "../data/relicContentCatalog";
import { RESEARCH_IDS } from "../data/researchContentCatalog";

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

const FACTION_LABELS: Readonly<Record<string, string>> = {
  keeper: "Keeper",
  heretic: "Hérétiques",
  undead: "Morts-vivants",
  morgana: "Morgana",
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

function formatFactionLabel(factionId: string): string {
  return FACTION_LABELS[factionId.toLowerCase()] ?? factionId;
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
  const visualDefinition = getItemDefinition(itemId);
  const equipmentDefinition = resolveEquipmentInfo(itemId);
  const effectiveDefinition = equipmentDefinition ?? visualDefinition;
  const factionCapeDefinition = getFactionCapeDefinition(itemId);
  const artifactFaction = resolveWeaponArtifactFaction(itemId);
  const artifactAdvantageTarget = artifactFaction === undefined
    ? undefined
    : getArtifactAdvantageTarget(artifactFaction);
  const artifactAdvantageBonusPercent = artifactAdvantageTarget === undefined
    ? undefined
    : resolveArtifactDungeonDamageBonusPercent(itemId, artifactAdvantageTarget);
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
  const equipped = effectiveDefinition === undefined
    ? undefined
    : state.equipment.slots.find((slot) => slot.slot === effectiveDefinition.slot);
  const equippedVisualDefinition = equipped?.itemId === undefined
    ? undefined
    : getItemDefinition(equipped.itemId);
  const equippedEffectiveDefinition = equipped?.itemId === undefined
    ? undefined
    : resolveEquipmentInfo(equipped.itemId) ?? equippedVisualDefinition;
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
    && effectiveDefinition?.slot === "weapon"
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
  const isEnchantmentShard = /^item_resource_enchantment_shard_t[4-8]$/.test(itemId);
  const enchantmentResearchCompleted = services.getAcademyModel().research.some((entry) => (
    entry.id === RESEARCH_IDS.enchantmentStudy && entry.state === "completed"
  ));
  const enchantmentShardDescription = isEnchantmentShard
    ? enchantmentResearchCompleted
      ? "Permet d’enchanter les équipements T4+ auprès du Marchand."
      : "Un éclat chargé d’une énergie inconnue. L’Académie pourrait permettre d’en comprendre l’usage."
    : undefined;
  const displayName = factionCapeDefinition?.name ?? getItemDisplayName(itemId);
  const displayTier = visualDefinition?.tier ?? factionCapeDefinition?.tier;
  const displaySlot = visualDefinition?.slot ?? effectiveDefinition?.slot;

  return (
    <div className={`item-tooltip${getEnchantmentFrameClass(enchantment)}`}>
      <div className="item-tooltip__header">
        <div className="item-tooltip__preview"><ItemVisual itemId={itemId} /></div>
        <div>
          <div className="item-tooltip__name">
            {displayName}{enchantment > 0 ? ` .${String(enchantment)}` : ""}
          </div>
          {displayTier !== undefined && displaySlot !== undefined && (
            <div className="item-tooltip__meta">
              Tier {String(displayTier)} · {SLOT_LABELS[displaySlot] ?? displaySlot}
              {visualDefinition?.handling !== undefined ? ` · ${visualDefinition.handling === "two_handed" ? "Deux mains" : "Une main"}` : ""}
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
            <>
              <div>
                <span>Charge totale</span>
                <strong>{String(relicProgress.chargeKills)} / {String(relicProgress.requiredChargeKills)}</strong>
              </div>
              {relicProgress.chargeObjectives.map((objective) => (
                <div key={objective.factionId}>
                  <span>{formatFactionLabel(objective.factionId)}</span>
                  <strong>{String(objective.chargeKills)} / {String(objective.requiredChargeKills)}</strong>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {effectiveDefinition !== undefined && (
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
          {Object.entries(effectiveDefinition.stats ?? {})
            .filter(([statId]) => statId !== "stat_attack_speed")
            .map(([statId, value]) => {
              const effectiveValue = getEffectiveEquipmentStat(
                statId,
                value,
                enchantmentStatMultiplier,
                masteryDamageMultiplier,
              );
              const authoredBaseValue = equipmentDefinition?.stats?.[statId]
                ?? visualDefinition?.stats?.[statId]
                ?? value;
              const ipBonus = effectiveValue - authoredBaseValue;
              const equippedBaseValue = equippedEffectiveDefinition?.stats?.[statId] ?? 0;
              const equippedValue = getEffectiveEquipmentStat(
                statId,
                equippedBaseValue,
                equippedEnchantmentStatMultiplier,
                equippedMasteryDamageMultiplier,
              );
              const delta = effectiveValue - equippedValue;
              const showDelta = equippedEffectiveDefinition !== undefined && equipped?.itemId !== itemId;
              return (
                <div key={statId}>
                  <span>{STAT_LABELS[statId] ?? statId}</span>
                  <strong>
                    +{formatStatValue(effectiveValue)}
                    {ipBonus > 0 && <small>(dont +{formatStatValue(ipBonus)} via améliorations)</small>}
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

      {factionCapeDefinition !== undefined && (
        <div className="item-tooltip__stats">
          <div>
            <span>Passif de faction</span>
            <strong>
              -{formatStatValue(factionCapeDefinition.dungeonDamageReductionPercent)}% dégâts subis dans les donjons {formatFactionLabel(factionCapeDefinition.factionId)}
            </strong>
          </div>
        </div>
      )}

      {artifactAdvantageTarget !== undefined && (
        <div className="item-tooltip__stats">
          <div>
            <span>Passif de faction</span>
            <strong>
              +{formatStatValue(artifactAdvantageBonusPercent ?? 0)}% dégâts infligés dans les donjons {formatFactionLabel(artifactAdvantageTarget)}
            </strong>
          </div>
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
      {enchantmentShardDescription !== undefined && (
        <p className="item-tooltip__description">{enchantmentShardDescription}</p>
      )}

      {durability !== undefined && (
        <div className="item-tooltip__durability">
          Durabilité : {String(durability.currentDurability)} / {String(durability.maxDurability)}
        </div>
      )}
      {quantity > 1 && <div className="item-tooltip__quantity">Quantité : {String(quantity)}</div>}
      {effectiveDefinition !== undefined && (
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
