import type { SaveProvider } from "@game/persistence";
import type { EntityId, World } from "@game/core";
import {
  getEnchantmentLevel,
  isEnchantmentLevel,
  type InventoryEntry,
  type ItemInstanceId,
} from "../inventory/types.js";
import { EquipmentComponent, type EquipmentData } from "./components.js";
import type { EquipmentManager } from "./equipment-manager.js";
import { isValidSlot, validateEquipmentState } from "./equipment-validator.js";
import {
  EQUIPMENT_SLOTS,
  type EquipmentLoadout,
  type EquipmentLoadoutSlot,
  type EquipmentSlot,
} from "./types.js";

interface SavedEquippedSlot {
  slot: string;
  instanceId: string;
  itemId: string;
  quantity: number;
  enchantment?: number;
}

interface SavedLoadoutSlot {
  slot: string;
  instanceId: string;
  itemId: string;
  enchantment?: number;
}

interface SavedEquipmentLoadout {
  id: string;
  name: string;
  slots: SavedLoadoutSlot[];
}

interface SavedEquipment {
  slots: SavedEquippedSlot[];
  /** Optional for backward compatibility with saves authored before loadouts. */
  loadouts?: SavedEquipmentLoadout[];
}

interface EquipmentSavePayload {
  equipments: SavedEquipment[];
}

export class EquipmentSaveProvider implements SaveProvider {
  readonly providerId = "equipment";

  /**
   * `resolveEntity` maps the i-th saved equipment set (save order) to its
   * target entity, so loaders can restore equipment onto the same entity as
   * the matching inventory instead of a freshly created one.
   */
  constructor(
    private readonly manager: EquipmentManager,
    private readonly world: World,
    private readonly resolveEntity?: (index: number) => EntityId,
  ) {}

  save(): unknown {
    const equipments: SavedEquipment[] = [];
    for (const entityId of this.manager.listEquippedEntities()) {
      const data = this.world.getComponent(entityId, EquipmentComponent);
      const slots: SavedEquippedSlot[] = [];
      for (const slot of EQUIPMENT_SLOTS) {
        const entry = data.slots.get(slot);
        if (entry !== undefined) {
          slots.push({
            slot,
            instanceId: entry.instanceId,
            itemId: entry.itemId,
            quantity: entry.quantity,
            enchantment: getEnchantmentLevel(entry),
          });
        }
      }
      const loadouts: SavedEquipmentLoadout[] = this.manager.getLoadouts(entityId).map((loadout) => ({
        id: loadout.id,
        name: loadout.name,
        slots: loadout.slots.map((slot) => ({
          slot: slot.slot,
          instanceId: slot.instanceId,
          itemId: slot.itemId,
          enchantment: slot.enchantment,
        })),
      }));
      equipments.push({ slots, loadouts });
    }
    return { equipments } satisfies EquipmentSavePayload;
  }

  load(data: unknown): void {
    if (data === null || typeof data !== "object" || !("equipments" in data)) {
      throw new Error("Invalid equipment save data: missing equipments");
    }
    const payload = data as EquipmentSavePayload;
    if (!Array.isArray(payload.equipments)) {
      throw new Error("Invalid equipment save data: equipments must be an array");
    }

    for (const [index, saved] of payload.equipments.entries()) {
      if (!Array.isArray(saved.slots)) {
        throw new Error("Invalid equipment save data: slots must be an array");
      }
      const slots = new Map<EquipmentSlot, InventoryEntry>();
      for (const savedSlot of saved.slots) {
        if (!isValidSlot(savedSlot.slot)) {
          throw new Error(`Invalid equipment save data: unknown slot "${savedSlot.slot}"`);
        }
        if (slots.has(savedSlot.slot)) {
          throw new Error(`Invalid equipment save data: duplicate slot "${savedSlot.slot}"`);
        }
        const enchantment = savedSlot.enchantment ?? 0;
        if (!isEnchantmentLevel(enchantment)) {
          throw new Error(
            `Invalid equipment save data: invalid enchantment ${String(enchantment)}`,
          );
        }
        slots.set(savedSlot.slot, {
          instanceId: savedSlot.instanceId as ItemInstanceId,
          itemId: savedSlot.itemId,
          quantity: savedSlot.quantity,
          enchantment,
        });
      }
      const equipmentData: EquipmentData = { slots };
      const errors = validateEquipmentState(equipmentData, this.manager.equipmentInfoResolver);
      if (errors.length > 0) {
        throw new Error(`Invalid equipment save data: ${errors.join("; ")}`);
      }

      const loadouts = this.#parseLoadouts(saved.loadouts);
      const entityId = this.resolveEntity?.(index) ?? this.world.createEntity();
      this.manager._restore(entityId, equipmentData);
      this.manager._restoreLoadouts(entityId, loadouts);
    }
  }

  #parseLoadouts(savedLoadouts: SavedEquipmentLoadout[] | undefined): readonly EquipmentLoadout[] {
    if (savedLoadouts === undefined) return [];
    if (!Array.isArray(savedLoadouts)) {
      throw new Error("Invalid equipment save data: loadouts must be an array");
    }
    const seenIds = new Set<string>();
    const loadouts: EquipmentLoadout[] = [];

    for (const savedLoadout of savedLoadouts) {
      if (
        typeof savedLoadout.id !== "string"
        || savedLoadout.id.trim().length === 0
        || typeof savedLoadout.name !== "string"
        || savedLoadout.name.trim().length === 0
        || !Array.isArray(savedLoadout.slots)
      ) {
        throw new Error("Invalid equipment save data: malformed loadout");
      }
      if (seenIds.has(savedLoadout.id)) {
        throw new Error(`Invalid equipment save data: duplicate loadout "${savedLoadout.id}"`);
      }
      seenIds.add(savedLoadout.id);

      const seenSlots = new Set<EquipmentSlot>();
      const seenInstances = new Set<string>();
      const loadoutSlots: EquipmentLoadoutSlot[] = [];
      for (const savedSlot of savedLoadout.slots) {
        if (!isValidSlot(savedSlot.slot)) {
          throw new Error(`Invalid equipment loadout: unknown slot "${savedSlot.slot}"`);
        }
        if (seenSlots.has(savedSlot.slot) || seenInstances.has(savedSlot.instanceId)) {
          throw new Error("Invalid equipment loadout: duplicate slot or instance");
        }
        const enchantment = savedSlot.enchantment ?? 0;
        if (!isEnchantmentLevel(enchantment)) {
          throw new Error(`Invalid equipment loadout enchantment: ${String(enchantment)}`);
        }
        seenSlots.add(savedSlot.slot);
        seenInstances.add(savedSlot.instanceId);
        loadoutSlots.push({
          slot: savedSlot.slot,
          instanceId: savedSlot.instanceId as ItemInstanceId,
          itemId: savedSlot.itemId,
          enchantment,
        });
      }
      loadouts.push({
        id: savedLoadout.id.trim(),
        name: savedLoadout.name.trim(),
        slots: loadoutSlots,
      });
    }

    return loadouts;
  }
}
