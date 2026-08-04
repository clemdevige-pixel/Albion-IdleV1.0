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
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "./types.js";

interface SavedEquippedSlot {
  slot: string;
  instanceId: string;
  itemId: string;
  quantity: number;
  enchantment?: number;
}

interface SavedEquipment {
  slots: SavedEquippedSlot[];
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
      equipments.push({ slots });
    }
    return { equipments } satisfies EquipmentSavePayload;
  }

  load(data: unknown): void {
    const payload = data as EquipmentSavePayload;
    for (const [index, saved] of payload.equipments.entries()) {
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
      const entityId = this.resolveEntity?.(index) ?? this.world.createEntity();
      this.manager._restore(entityId, equipmentData);
    }
  }
}
