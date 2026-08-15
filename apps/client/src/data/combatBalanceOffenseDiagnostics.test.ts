import { describe, expect, it } from "vitest";
import {
  calculateDamage,
  getEnemyCombatProfile,
} from "@game/gameplay";
import {
  COMBAT_BALANCE_CHECKPOINTS,
  COMBAT_BALANCE_LOADOUTS,
  COMBAT_BALANCE_REALLOCATIONS,
} from "./combatBalanceMatrix.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { getWeaponAttackSpeed } from "./itemPower.js";
import { resolveUnlockedWeaponAbilities } from "./weaponContentCatalog.js";

const DIAGNOSTIC_LOADOUT_IDS = [
  "broadsword_t3_weapon_only",
  "longbow_t3_weapon_only",
  "infernal_t3_weapon_only",
] as const;

const DIAGNOSTIC_CHECKPOINT_IDS = [
  "forest_s8",
  "forest_s9",
  "forest_s10",
  "swamp_s1",
] as const;

describe("data-driven early weapon offense diagnostics", () => {
  it("reports why naked T3 weapons diverge near the Forest/Swamp boundary", () => {
    const reallocation = COMBAT_BALANCE_REALLOCATIONS.find(
      (candidate) => candidate.id === "reallocation_probe_280_zero_def",
    );
    if (reallocation === undefined) throw new Error("Missing 280 HP zero-defense probe");

    const rows = DIAGNOSTIC_LOADOUT_IDS.flatMap((loadoutId) => {
      const loadout = COMBAT_BALANCE_LOADOUTS.find((candidate) => candidate.id === loadoutId);
      if (loadout === undefined) throw new Error(`Missing diagnostic loadout: ${loadoutId}`);

      const weapon = resolveEquipmentInfo(loadout.weaponItemId);
      if (weapon === undefined) throw new Error(`Missing weapon definition: ${loadout.weaponItemId}`);
      const attackSpeed = getWeaponAttackSpeed(loadout.weaponItemId);
      if (attackSpeed === undefined) throw new Error(`Missing attack speed: ${loadout.weaponItemId}`);

      const physicalDamage = weapon.stats?.stat_physical_damage ?? 0;
      const magicalDamage = weapon.stats?.stat_magical_damage ?? 0;
      const damageType = physicalDamage > 0 ? "physical" as const : "magical" as const;
      const primaryDamage = damageType === "physical" ? physicalDamage : magicalDamage;
      const primaryAbility = resolveUnlockedWeaponAbilities(
        loadout.weaponItemId,
        loadout.specializationMasteryLevel,
      )[0];

      return DIAGNOSTIC_CHECKPOINT_IDS.map((checkpointId) => {
        const checkpoint = COMBAT_BALANCE_CHECKPOINTS.find(
          (candidate) => candidate.id === checkpointId,
        );
        if (checkpoint === undefined) throw new Error(`Missing checkpoint: ${checkpointId}`);

        const elite = getEnemyCombatProfile(
          checkpoint.zoneIndex,
          checkpoint.segmentIndex,
          4,
          checkpoint.worldBandId,
        );
        const defenderStats = { armor: elite.armor, magicResistance: elite.magicResistance };
        const autoHit = calculateDamage(
          primaryDamage,
          { physicalDamage: 0, magicalDamage: 0 },
          defenderStats,
          damageType,
        ).mitigatedDamage;
        const autoDps = autoHit * attackSpeed;
        const abilityRatio = 1 + (primaryAbility?.bonusDamageRatio ?? 0);
        const abilityDamage = calculateDamage(
          primaryDamage * abilityRatio,
          { physicalDamage: 0, magicalDamage: 0 },
          defenderStats,
          damageType,
        ).mitigatedDamage;
        const abilityDps = primaryAbility === undefined || primaryAbility.cooldown <= 0
          ? 0
          : abilityDamage / primaryAbility.cooldown;
        const sustainedDps = autoDps + abilityDps;
        const eliteTtkSeconds = elite.hp / Math.max(1, sustainedDps);
        const incomingHit = calculateDamage(
          elite.damage,
          { physicalDamage: 0, magicalDamage: 0 },
          { armor: reallocation.hero.armor, magicResistance: reallocation.hero.magicResistance },
          "physical",
        ).mitigatedDamage;
        const projectedEliteDamageTaken = incomingHit * elite.attackSpeed * eliteTtkSeconds;

        return {
          loadout: loadout.id,
          checkpoint: checkpoint.label,
          rawWeaponDamage: Number(primaryDamage.toFixed(1)),
          attackSpeed: Number(attackSpeed.toFixed(2)),
          autoDps: Number(autoDps.toFixed(2)),
          abilityDps: Number(abilityDps.toFixed(2)),
          sustainedDps: Number(sustainedDps.toFixed(2)),
          eliteHp: Number(elite.hp.toFixed(1)),
          eliteTtkSeconds: Number(eliteTtkSeconds.toFixed(2)),
          projectedEliteDamageTaken: Number(projectedEliteDamageTaken.toFixed(1)),
          nakedHp: reallocation.hero.maxHealth,
          survivesElite: projectedEliteDamageTaken < reallocation.hero.maxHealth,
        };
      });
    });

    console.table(rows);
    expect(rows).toHaveLength(DIAGNOSTIC_LOADOUT_IDS.length * DIAGNOSTIC_CHECKPOINT_IDS.length);
    expect(rows.every((row) => row.sustainedDps > 0 && row.eliteTtkSeconds > 0)).toBe(true);
  });
});
