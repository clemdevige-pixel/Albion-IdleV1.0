import {
  calculateDamage,
  getEnchantmentStatMultiplier,
  type DamageType,
  type EnchantmentLevel,
} from "@game/gameplay";
import {
  WEAPON_ITEM_DEFINITIONS,
  resolveUnlockedWeaponAbilities,
  resolveWeaponAttackSpeed,
} from "./weaponContentCatalog.js";
import { NON_WEAPON_ITEM_DEFINITIONS } from "./itemContentCatalog.js";
import { getWeaponAbilityMechanics } from "./weaponAbilityMechanics.js";
import { getWeaponHandlingOffensiveMultiplier } from "./weaponHandlingBalance.js";

export interface CombatBalanceEnemyProfile {
  readonly id: string;
  readonly health: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly physicalDamage: number;
  readonly magicalDamage: number;
  readonly attackSpeed: number;
}

export interface CombatBalanceEquipmentPiece {
  readonly itemId: string;
  readonly enchantment?: EnchantmentLevel;
}

export interface CombatBalanceLoadout {
  readonly weaponId: string;
  readonly masteryLevel: number;
  readonly weaponEnchantment?: EnchantmentLevel;
  readonly offHandId?: string;
  readonly offHandEnchantment?: EnchantmentLevel;
  readonly equipment?: readonly CombatBalanceEquipmentPiece[];
  readonly baseHealth?: number;
  readonly baseArmor?: number;
  readonly baseMagicResistance?: number;
}

export interface CombatBalanceBreakdown {
  readonly autoAttackDamage: number;
  readonly abilityDamage: number;
  readonly dotDamage: number;
  readonly damageTaken: number;
  readonly autoAttacks: number;
  readonly abilityCasts: number;
  readonly dotTicks: number;
}

export interface CombatBalanceResult {
  readonly weaponId: string;
  readonly offHandId?: string;
  readonly masteryLevel: number;
  readonly victory: boolean;
  readonly elapsedSeconds: number;
  readonly heroHealthRemaining: number;
  readonly enemyHealthRemaining: number;
  readonly dps: number;
  readonly incomingDps: number;
  readonly breakdown: CombatBalanceBreakdown;
}

interface TimedEffect {
  readonly effectId: string;
  remaining: number;
  readonly statId?: "stat_armor" | "stat_magic_resistance";
  readonly statDelta?: number;
  readonly effectType: "debuff" | "stun" | "silence";
}

interface ActiveDot {
  readonly effectId: string;
  readonly sourceDamage: number;
  readonly damageType: DamageType;
  readonly ratio: number;
  readonly interval: number;
  intervalRemaining: number;
  ticksRemaining: number;
}

interface DefensiveStats {
  readonly health: number;
  readonly armor: number;
  readonly magicResistance: number;
}

const DEFAULT_HERO_HEALTH = 500;
const DEFAULT_HERO_ARMOR = 0;
const DEFAULT_HERO_MAGIC_RESISTANCE = 0;
const STEP_SECONDS = 0.05;
const MAX_SIMULATION_SECONDS = 180;

function weaponDamage(loadout: CombatBalanceLoadout): {
  readonly amount: number;
  readonly damageType: "physical" | "magical";
} {
  const weapon = WEAPON_ITEM_DEFINITIONS[loadout.weaponId];
  if (weapon === undefined) throw new Error(`Unknown weapon: ${loadout.weaponId}`);
  const handlingMultiplier = getWeaponHandlingOffensiveMultiplier(weapon.handling);
  const enchantmentMultiplier = getEnchantmentStatMultiplier(loadout.weaponEnchantment ?? 0);
  const physical = (weapon.stats.stat_physical_damage ?? 0) * handlingMultiplier * enchantmentMultiplier;
  const magical = (weapon.stats.stat_magical_damage ?? 0) * handlingMultiplier * enchantmentMultiplier;
  return magical > physical
    ? { amount: magical, damageType: "magical" }
    : { amount: physical, damageType: "physical" };
}

function readDefensivePiece(itemId: string, enchantment: EnchantmentLevel): DefensiveStats {
  const item = NON_WEAPON_ITEM_DEFINITIONS[itemId];
  if (item === undefined) throw new Error(`Unknown equipment: ${itemId}`);
  const multiplier = getEnchantmentStatMultiplier(enchantment);
  return {
    health: (item.stats.stat_max_health ?? 0) * multiplier,
    armor: (item.stats.stat_armor ?? 0) * multiplier,
    magicResistance: (item.stats.stat_magic_resistance ?? 0) * multiplier,
  };
}

function equipmentDefenses(loadout: CombatBalanceLoadout): DefensiveStats {
  const pieces: CombatBalanceEquipmentPiece[] = [...(loadout.equipment ?? [])];
  if (loadout.offHandId !== undefined) {
    const offHand = NON_WEAPON_ITEM_DEFINITIONS[loadout.offHandId];
    if (offHand === undefined || offHand.slot !== "off_hand") {
      throw new Error(`Unknown off-hand: ${loadout.offHandId}`);
    }
    pieces.push({ itemId: loadout.offHandId, enchantment: loadout.offHandEnchantment ?? 0 });
  }
  return pieces.reduce<DefensiveStats>((total, piece) => {
    const stats = readDefensivePiece(piece.itemId, piece.enchantment ?? 0);
    return {
      health: total.health + stats.health,
      armor: total.armor + stats.armor,
      magicResistance: total.magicResistance + stats.magicResistance,
    };
  }, { health: 0, armor: 0, magicResistance: 0 });
}

function applyDamage(
  baseDamage: number,
  sourceDamage: number,
  damageType: DamageType,
  armor: number,
  magicResistance: number,
  includeSourceStat = true,
): number {
  return calculateDamage(
    baseDamage,
    {
      physicalDamage: includeSourceStat && damageType === "physical" ? sourceDamage : 0,
      magicalDamage: includeSourceStat && damageType === "magical" ? sourceDamage : 0,
    },
    { armor, magicResistance },
    damageType,
  ).mitigatedDamage;
}

function enemyDamageType(enemy: CombatBalanceEnemyProfile): "physical" | "magical" {
  return enemy.magicalDamage > enemy.physicalDamage ? "magical" : "physical";
}

function effectiveResistance(
  base: number,
  statId: "stat_armor" | "stat_magic_resistance",
  effects: readonly TimedEffect[],
): number {
  return effects.reduce(
    (value, effect) => effect.statId === statId ? value + (effect.statDelta ?? 0) : value,
    base,
  );
}

function hasEffect(effects: readonly TimedEffect[], dots: readonly ActiveDot[], effectId: string): boolean {
  return effects.some((effect) => effect.effectId === effectId && effect.remaining > 0)
    || dots.some((dot) => dot.effectId === effectId && dot.ticksRemaining > 0);
}

export function simulateCombatBalance(
  loadout: CombatBalanceLoadout,
  enemy: CombatBalanceEnemyProfile,
): CombatBalanceResult {
  const weapon = WEAPON_ITEM_DEFINITIONS[loadout.weaponId];
  if (weapon === undefined) throw new Error(`Unknown weapon: ${loadout.weaponId}`);
  const offensive = weaponDamage(loadout);
  const attackSpeed = resolveWeaponAttackSpeed(loadout.weaponId) ?? 1;
  const abilities = resolveUnlockedWeaponAbilities(loadout.weaponId, loadout.masteryLevel);
  const cooldowns = new Map(abilities.map((ability) => [ability.id, 0]));
  const worn = equipmentDefenses(loadout);

  let heroHealth = (loadout.baseHealth ?? DEFAULT_HERO_HEALTH) + worn.health;
  let enemyHealth = enemy.health;
  let elapsed = 0;
  let heroAttackTimer = 0;
  let enemyAttackTimer = 0;
  const effects: TimedEffect[] = [];
  const dots: ActiveDot[] = [];
  const breakdown = {
    autoAttackDamage: 0,
    abilityDamage: 0,
    dotDamage: 0,
    damageTaken: 0,
    autoAttacks: 0,
    abilityCasts: 0,
    dotTicks: 0,
  };

  const dealToEnemy = (
    baseDamage: number,
    sourceDamage: number,
    damageType: DamageType,
    bucket: "auto" | "ability" | "dot",
    includeSourceStat = true,
  ) => {
    const armor = effectiveResistance(enemy.armor, "stat_armor", effects);
    const magicResistance = effectiveResistance(enemy.magicResistance, "stat_magic_resistance", effects);
    const dealt = Math.min(
      enemyHealth,
      applyDamage(baseDamage, sourceDamage, damageType, armor, magicResistance, includeSourceStat),
    );
    enemyHealth = Math.max(0, enemyHealth - dealt);
    if (bucket === "auto") {
      breakdown.autoAttackDamage += dealt;
      breakdown.autoAttacks += 1;
    } else if (bucket === "ability") {
      breakdown.abilityDamage += dealt;
    } else {
      breakdown.dotDamage += dealt;
      breakdown.dotTicks += 1;
    }
  };

  while (heroHealth > 0 && enemyHealth > 0 && elapsed < MAX_SIMULATION_SECONDS) {
    elapsed += STEP_SECONDS;

    for (const ability of abilities) {
      cooldowns.set(ability.id, Math.max(0, (cooldowns.get(ability.id) ?? 0) - STEP_SECONDS));
    }
    for (const effect of effects) effect.remaining -= STEP_SECONDS;
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      if (effects[index]!.remaining <= 0) effects.splice(index, 1);
    }

    for (let index = dots.length - 1; index >= 0; index -= 1) {
      const dot = dots[index]!;
      dot.intervalRemaining -= STEP_SECONDS;
      while (dot.intervalRemaining <= 0 && dot.ticksRemaining > 0 && enemyHealth > 0) {
        dot.intervalRemaining += dot.interval;
        dot.ticksRemaining -= 1;
        dealToEnemy(dot.sourceDamage * dot.ratio, dot.sourceDamage, dot.damageType, "dot", false);
      }
      if (dot.ticksRemaining <= 0) dots.splice(index, 1);
    }
    if (enemyHealth <= 0) break;

    for (const ability of abilities) {
      if ((cooldowns.get(ability.id) ?? 0) > 0) continue;
      const profile = getWeaponAbilityMechanics(ability.id);
      const autoRule = profile?.autoRule ?? ability.autoCast;
      if (autoRule?.kind === "target_health_below" && enemyHealth / enemy.health > autoRule.ratio) continue;
      if (autoRule?.kind === "target_has_effect" && !hasEffect(effects, dots, autoRule.effectId)) continue;

      cooldowns.set(ability.id, ability.cooldown);
      breakdown.abilityCasts += 1;

      if (profile === undefined) {
        dealToEnemy(offensive.amount * ability.bonusDamageRatio, offensive.amount, ability.damageType, "ability");
        break;
      }

      for (const mechanic of profile.mechanics) {
        if (enemyHealth <= 0) break;
        if (mechanic.kind === "damage") {
          let ratio = mechanic.ratio;
          if (mechanic.bonusHealthBelow !== undefined && enemyHealth / enemy.health <= mechanic.bonusHealthBelow.ratio) {
            ratio += mechanic.bonusHealthBelow.bonusRatio;
          }
          if (mechanic.bonusEffect !== undefined && hasEffect(effects, dots, mechanic.bonusEffect.effectId)) {
            ratio += mechanic.bonusEffect.bonusRatio;
          }
          const hits = Math.max(1, mechanic.hits ?? 1);
          for (let hit = 0; hit < hits && enemyHealth > 0; hit += 1) {
            dealToEnemy(offensive.amount * (ratio / hits), offensive.amount, ability.damageType, "ability");
          }
        } else if (mechanic.kind === "dot") {
          const existing = dots.find((dot) => dot.effectId === mechanic.effectId);
          if (existing !== undefined) {
            existing.intervalRemaining = mechanic.interval;
            existing.ticksRemaining = mechanic.ticks;
          } else {
            dots.push({
              effectId: mechanic.effectId,
              sourceDamage: offensive.amount,
              damageType: ability.damageType,
              ratio: mechanic.ratio,
              interval: mechanic.interval,
              intervalRemaining: mechanic.interval,
              ticksRemaining: mechanic.ticks,
            });
          }
        } else {
          const duration = mechanic.duration;
          const existing = effects.find((effect) => effect.effectId === mechanic.effectId);
          if (existing !== undefined) {
            existing.remaining = duration;
          } else {
            effects.push({
              effectId: mechanic.effectId,
              remaining: duration,
              statId: mechanic.statId,
              statDelta: mechanic.statDelta,
              effectType: mechanic.effectType,
            });
          }
        }
      }
      break;
    }
    if (enemyHealth <= 0) break;

    heroAttackTimer += STEP_SECONDS;
    const heroInterval = 1 / Math.max(0.01, attackSpeed);
    if (heroAttackTimer >= heroInterval) {
      heroAttackTimer -= heroInterval;
      dealToEnemy(0, offensive.amount, offensive.damageType, "auto");
    }
    if (enemyHealth <= 0) break;

    const enemyStunned = effects.some((effect) => effect.effectType === "stun" && effect.remaining > 0);
    if (!enemyStunned) {
      enemyAttackTimer += STEP_SECONDS;
      const enemyInterval = 1 / Math.max(0.01, enemy.attackSpeed);
      if (enemyAttackTimer >= enemyInterval) {
        enemyAttackTimer -= enemyInterval;
        const type = enemyDamageType(enemy);
        const sourceDamage = type === "magical" ? enemy.magicalDamage : enemy.physicalDamage;
        const armor = (loadout.baseArmor ?? DEFAULT_HERO_ARMOR) + worn.armor;
        const magicResistance = (loadout.baseMagicResistance ?? DEFAULT_HERO_MAGIC_RESISTANCE) + worn.magicResistance;
        const incoming = Math.min(heroHealth, applyDamage(0, sourceDamage, type, armor, magicResistance));
        heroHealth = Math.max(0, heroHealth - incoming);
        breakdown.damageTaken += incoming;
      }
    }
  }

  const totalDamage = breakdown.autoAttackDamage + breakdown.abilityDamage + breakdown.dotDamage;
  const duration = Math.max(STEP_SECONDS, elapsed);
  return {
    weaponId: loadout.weaponId,
    offHandId: loadout.offHandId,
    masteryLevel: loadout.masteryLevel,
    victory: enemyHealth <= 0 && heroHealth > 0,
    elapsedSeconds: Number(elapsed.toFixed(2)),
    heroHealthRemaining: Number(heroHealth.toFixed(2)),
    enemyHealthRemaining: Number(enemyHealth.toFixed(2)),
    dps: Number((totalDamage / duration).toFixed(2)),
    incomingDps: Number((breakdown.damageTaken / duration).toFixed(2)),
    breakdown: {
      autoAttackDamage: Number(breakdown.autoAttackDamage.toFixed(2)),
      abilityDamage: Number(breakdown.abilityDamage.toFixed(2)),
      dotDamage: Number(breakdown.dotDamage.toFixed(2)),
      damageTaken: Number(breakdown.damageTaken.toFixed(2)),
      autoAttacks: breakdown.autoAttacks,
      abilityCasts: breakdown.abilityCasts,
      dotTicks: breakdown.dotTicks,
    },
  };
}

export function compareCombatBalance(
  loadouts: readonly CombatBalanceLoadout[],
  enemy: CombatBalanceEnemyProfile,
): readonly CombatBalanceResult[] {
  return loadouts
    .map((loadout) => simulateCombatBalance(loadout, enemy))
    .sort((a, b) => {
      if (a.victory !== b.victory) return a.victory ? -1 : 1;
      if (a.victory && b.victory) return a.elapsedSeconds - b.elapsedSeconds;
      return b.enemyHealthRemaining - a.enemyHealthRemaining;
    });
}
