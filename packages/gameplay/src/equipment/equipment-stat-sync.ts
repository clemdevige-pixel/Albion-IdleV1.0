import type { EntityId } from "@game/core";
import { getEnchantmentLevel, type InventoryEntry } from "../inventory/types.js";
import type { StatsManager } from "../stats/stats-manager.js";
import type { ModifierId, StatId, StatModifier } from "../stats/types.js";
import type { EquipmentInfoResolver, EquipmentSlot } from "./types.js";
import { getEnchantmentStatMultiplier } from "./enchantment-balance.js";

const EQUIPMENT_SOURCE_PREFIX = "equipment:";
const EQUIPMENT_MODIFIER_PRIORITY = 0;

/** Notified after equipment changed computed stats (e.g. to resync max health). */
export type EquipmentStatsChangedHook = (
  entityId: EntityId,
  changedStats: readonly StatId[],
) => void;

/**
 * Keeps stat modifiers in lockstep with worn equipment (11_STAT §6).
 * Modifiers are always rebuilt from the worn set — never saved — so the
 * equipment itself stays the authoritative source (11_STAT §16).
 */
export class EquipmentStatSync {
  readonly #statsManager: StatsManager;
  readonly #resolveEquipmentInfo: EquipmentInfoResolver;
  readonly #onStatsChanged: EquipmentStatsChangedHook | undefined;

  constructor(
    statsManager: StatsManager,
    resolveEquipmentInfo: EquipmentInfoResolver,
    onStatsChanged?: EquipmentStatsChangedHook,
  ) {
    this.#statsManager = statsManager;
    this.#resolveEquipmentInfo = resolveEquipmentInfo;
    this.#onStatsChanged = onStatsChanged;
  }

  /** Reconciles the entity's equipment modifiers with the given worn set. */
  apply(entityId: EntityId, slots: ReadonlyMap<EquipmentSlot, InventoryEntry>): void {
    if (!this.#statsManager.hasStats(entityId)) {
      return;
    }

    const desired = this.#buildDesiredModifiers(slots);
    const touched = new Set<StatId>();
    const before = new Map<StatId, number>();
    const record = (statId: StatId): void => {
      if (!touched.has(statId)) {
        touched.add(statId);
        before.set(statId, this.#statsManager.getStat(entityId, statId).computed);
      }
    };

    for (const existing of this.#statsManager.getModifiers(entityId)) {
      if (!existing.source.startsWith(EQUIPMENT_SOURCE_PREFIX)) {
        continue;
      }
      record(existing.statId);
      this.#statsManager.removeModifier(entityId, existing.id);
    }
    for (const modifier of desired.values()) {
      record(modifier.statId);
      this.#statsManager.addModifier(entityId, modifier);
    }

    if (this.#onStatsChanged === undefined) {
      return;
    }
    const changed = [...touched].filter(
      (statId) => this.#statsManager.getStat(entityId, statId).computed !== before.get(statId),
    );
    if (changed.length > 0) {
      this.#onStatsChanged(entityId, changed);
    }
  }

  #buildDesiredModifiers(
    slots: ReadonlyMap<EquipmentSlot, InventoryEntry>,
  ): ReadonlyMap<ModifierId, StatModifier> {
    const desired = new Map<ModifierId, StatModifier>();
    for (const [slot, entry] of slots) {
      const stats = this.#resolveEquipmentInfo(entry.itemId)?.stats;
      if (stats === undefined) {
        continue;
      }
      const enchantmentMultiplier = getEnchantmentStatMultiplier(
        getEnchantmentLevel(entry),
      );
      for (const [statKey, value] of Object.entries(stats)) {
        const id = `equip_${slot}_${statKey}` as ModifierId;
        desired.set(id, {
          id,
          statId: statKey as StatId,
          type: "flat",
          value: statKey === "stat_attack_speed"
            ? value
            : value * enchantmentMultiplier,
          priority: EQUIPMENT_MODIFIER_PRIORITY,
          source: `${EQUIPMENT_SOURCE_PREFIX}${slot}`,
        });
      }
    }
    return desired;
  }
}
