import type { SaveProvider } from "@game/persistence";
import type { EntityId, World } from "@game/core";
import { InventoryComponent, type InventoryData } from "./components.js";
import type { InventoryManager } from "./inventory-manager.js";
import { validateInventory } from "./inventory-validator.js";
import {
  getEnchantmentLevel,
  isEnchantmentLevel,
  type InventoryEntry,
  type ItemInstanceId,
} from "./types.js";

interface SavedSlot {
  position: number;
  instanceId: string;
  itemId: string;
  quantity: number;
  enchantment?: number;
}

interface SavedEntry {
  instanceId: string;
  itemId: string;
  quantity: number;
  enchantment?: number;
}

interface SavedInventory {
  capacity: number;
  nextInstanceCounter: number;
  slots: SavedSlot[];
  /** Item occupying the dedicated Bag Slot (12_INVENTORY §12: active bag). */
  activeBag?: SavedEntry | null;
}

interface InventorySavePayload {
  inventories: SavedInventory[];
}

function getRequiredNextInstanceCounter(
  savedCounter: number,
  entries: readonly { readonly instanceId: string }[],
): number {
  let nextCounter = Number.isInteger(savedCounter) && savedCounter >= 0
    ? savedCounter
    : 0;

  for (const entry of entries) {
    const match = /^item_(\d+)$/.exec(entry.instanceId);
    const numericId = match?.[1] === undefined ? undefined : Number(match[1]);
    if (
      numericId !== undefined
      && Number.isSafeInteger(numericId)
      && numericId >= nextCounter
    ) {
      nextCounter = numericId + 1;
    }
  }

  return nextCounter;
}

export class InventorySaveProvider implements SaveProvider {
  readonly providerId = "inventory";

  /**
   * `resolveEntity` maps the i-th saved inventory (save order) to its target
   * entity. Without it each provider creates its own entity on load, so the
   * player's inventory and equipment would land on different entities and
   * cross-component flows (repair of equipped items, sell checks) would break.
   */
  constructor(
    private readonly manager: InventoryManager,
    private readonly world: World,
    private readonly resolveEntity?: (index: number) => EntityId,
  ) {}

  save(): unknown {
    const inventories: SavedInventory[] = [];
    for (const entityId of this.manager.listInventories()) {
      const data = this.world.getComponent(entityId, InventoryComponent);
      const errors = validateInventory(
        data,
        this.manager.stackInfoResolver,
        this.manager.bagInfoResolver,
      );
      if (errors.length > 0) {
        throw new Error(`Refusing to persist invalid inventory data: ${errors.join("; ")}`);
      }

      const slots: SavedSlot[] = [];
      for (const [position, entry] of data.slots) {
        slots.push({
          position,
          instanceId: entry.instanceId,
          itemId: entry.itemId,
          quantity: entry.quantity,
          enchantment: getEnchantmentLevel(entry),
        });
      }
      slots.sort((a, b) => a.position - b.position);
      inventories.push({
        capacity: data.capacity,
        nextInstanceCounter: data.nextInstanceCounter,
        slots,
        activeBag:
          data.activeBag === undefined
            ? null
            : {
                instanceId: data.activeBag.instanceId,
                itemId: data.activeBag.itemId,
                quantity: data.activeBag.quantity,
                enchantment: getEnchantmentLevel(data.activeBag),
              },
      });
    }
    return { inventories } satisfies InventorySavePayload;
  }

  load(data: unknown): void {
    const payload = data as InventorySavePayload;
    for (const [index, saved] of payload.inventories.entries()) {
      const slots = new Map<number, InventoryEntry>();
      for (const slot of saved.slots) {
        const enchantment = slot.enchantment ?? 0;
        if (!isEnchantmentLevel(enchantment)) {
          throw new Error(
            `Invalid inventory save data: invalid enchantment ${String(enchantment)}`,
          );
        }
        slots.set(slot.position, {
          instanceId: slot.instanceId as ItemInstanceId,
          itemId: slot.itemId,
          quantity: slot.quantity,
          enchantment,
        });
      }
      const savedBag = saved.activeBag ?? null;
      const savedBagEnchantment = savedBag?.enchantment ?? 0;
      if (!isEnchantmentLevel(savedBagEnchantment)) {
        throw new Error(
          `Invalid inventory save data: invalid bag enchantment ${String(savedBagEnchantment)}`,
        );
      }
      const existingEntries = [
        ...saved.slots,
        ...(savedBag === null ? [] : [savedBag]),
      ];
      const inventoryData: InventoryData = {
        capacity: saved.capacity,
        slots,
        activeBag:
          savedBag === null
            ? undefined
            : {
                instanceId: savedBag.instanceId as ItemInstanceId,
                itemId: savedBag.itemId,
                quantity: savedBag.quantity,
                enchantment: savedBagEnchantment,
              },
        // Historical saves may contain a stale allocator counter. Reconcile it
        // against every persisted identity before the runtime can mint new ids.
        nextInstanceCounter: getRequiredNextInstanceCounter(
          saved.nextInstanceCounter,
          existingEntries,
        ),
      };
      const errors = validateInventory(
        inventoryData,
        this.manager.stackInfoResolver,
        this.manager.bagInfoResolver,
      );
      if (errors.length > 0) {
        throw new Error(`Invalid inventory save data: ${errors.join("; ")}`);
      }
      const entityId = this.resolveEntity?.(index) ?? this.world.createEntity();
      this.manager._restore(entityId, inventoryData);
    }
  }
}
