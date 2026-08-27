import type { EntityId, World } from "@game/core";
import { InventoryComponent, type InventoryData } from "./components.js";
import { validateInventory } from "./inventory-validator.js";
import {
  areEntriesStackCompatible,
  effectiveMaxStack,
  getEnchantmentLevel,
  isEnchantmentLevel,
  inventoryFail,
  inventoryOk,
  toItemInstanceId,
  type AddQuantityOutcome,
  type BagChangeOutcome,
  type BagInfoResolver,
  type EnchantmentLevel,
  type InventoryEntry,
  type InventoryResult,
  type InventorySlot,
  type ItemInstanceId,
  type ItemStackInfoLike,
  type MergeStacksOutcome,
  type RemoveQuantityOutcome,
  type StackInfoResolver,
} from "./types.js";

export class InventoryManager {
  readonly #world: World;
  readonly #inventories = new Set<EntityId>();
  readonly #resolveStackInfo: StackInfoResolver | undefined;
  readonly #resolveBagInfo: BagInfoResolver | undefined;

  constructor(world: World, resolveStackInfo?: StackInfoResolver, resolveBagInfo?: BagInfoResolver) {
    this.#world = world;
    this.#resolveStackInfo = resolveStackInfo;
    this.#resolveBagInfo = resolveBagInfo;
  }

  get stackInfoResolver(): StackInfoResolver | undefined {
    return this.#resolveStackInfo;
  }

  get bagInfoResolver(): BagInfoResolver | undefined {
    return this.#resolveBagInfo;
  }

  createInventory(entityId: EntityId, capacity: number): void {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`Inventory capacity must be a positive integer, got ${String(capacity)}`);
    }
    const data: InventoryData = {
      capacity,
      slots: new Map(),
      activeBag: undefined,
      nextInstanceCounter: this.#getGlobalNextInstanceCounter(),
    };
    this.#world.addComponent(entityId, InventoryComponent, data);
    this.#inventories.add(entityId);
  }

  destroyInventory(entityId: EntityId): void {
    this.#world.removeComponent(entityId, InventoryComponent);
    this.#inventories.delete(entityId);
  }

  hasInventory(entityId: EntityId): boolean {
    return this.#world.hasComponent(entityId, InventoryComponent);
  }

  listInventories(): readonly EntityId[] {
    return [...this.#inventories];
  }

  /** Current capacity = base capacity + active bag bonus (12_INVENTORY §4). */
  getCapacity(entityId: EntityId): number {
    return this.#capacityOf(this.#getData(entityId));
  }

  getBaseCapacity(entityId: EntityId): number {
    return this.#getData(entityId).capacity;
  }

  getOccupiedCount(entityId: EntityId): number {
    return this.#getData(entityId).slots.size;
  }

  isFull(entityId: EntityId): boolean {
    const data = this.#getData(entityId);
    return data.slots.size >= this.#capacityOf(data);
  }

  listSlots(entityId: EntityId): readonly InventorySlot[] {
    const data = this.#getData(entityId);
    const slots: InventorySlot[] = [];
    for (let position = 0; position < this.#capacityOf(data); position += 1) {
      slots.push({ position, entry: data.slots.get(position) });
    }
    return slots;
  }

  getSlot(entityId: EntityId, position: number): InventoryResult<InventorySlot> {
    const data = this.#getData(entityId);
    if (!this.#isValidPosition(data, position)) {
      return inventoryFail("invalid_position");
    }
    return inventoryOk({ position, entry: data.slots.get(position) });
  }

  findFreeSlots(entityId: EntityId): readonly number[] {
    const data = this.#getData(entityId);
    const free: number[] = [];
    for (let position = 0; position < this.#capacityOf(data); position += 1) {
      if (!data.slots.has(position)) {
        free.push(position);
      }
    }
    return free;
  }

  addEntry(
    entityId: EntityId,
    itemId: string,
    position?: number,
    enchantment: EnchantmentLevel = 0,
  ): InventoryResult<InventoryEntry> {
    const data = this.#getData(entityId);

    let targetPosition: number;
    if (position === undefined) {
      const free = this.#firstFreePosition(data);
      if (free === undefined) {
        return inventoryFail("inventory_full");
      }
      targetPosition = free;
    } else {
      if (!this.#isValidPosition(data, position)) {
        return inventoryFail("invalid_position");
      }
      if (data.slots.has(position)) {
        return inventoryFail("slot_occupied");
      }
      targetPosition = position;
    }

    const entry: InventoryEntry = {
      instanceId: this.#allocateInstanceId(data),
      itemId,
      quantity: 1,
      enchantment,
    };
    data.slots.set(targetPosition, entry);
    return inventoryOk(entry);
  }

  removeEntryAt(entityId: EntityId, position: number): InventoryResult<InventoryEntry> {
    const data = this.#getData(entityId);
    if (!this.#isValidPosition(data, position)) {
      return inventoryFail("invalid_position");
    }
    const entry = data.slots.get(position);
    if (entry === undefined) {
      return inventoryFail("entry_not_found");
    }
    data.slots.delete(position);
    return inventoryOk(entry);
  }

  /**
   * Extracts exactly one item from a slot. For a stacked entry, the extracted
   * item keeps the stack's runtime identity while the remaining quantity is
   * assigned a fresh inventory identity. This lets equipment slots continue
   * to contain exactly one item without discarding the rest of the stack.
   */
  takeOneAt(entityId: EntityId, position: number): InventoryResult<InventoryEntry> {
    const data = this.#getData(entityId);
    if (!this.#isValidPosition(data, position)) {
      return inventoryFail("invalid_position");
    }
    const entry = data.slots.get(position);
    if (entry === undefined) {
      return inventoryFail("entry_not_found");
    }
    if (entry.quantity === 1) {
      data.slots.delete(position);
      return inventoryOk(entry);
    }

    data.slots.set(position, {
      instanceId: this.#allocateInstanceId(data),
      itemId: entry.itemId,
      quantity: entry.quantity - 1,
      enchantment: getEnchantmentLevel(entry),
    });
    return inventoryOk({ ...entry, quantity: 1 });
  }

  removeEntryByInstanceId(
    entityId: EntityId,
    instanceId: ItemInstanceId,
  ): InventoryResult<InventoryEntry> {
    const data = this.#getData(entityId);
    for (const [position, entry] of data.slots) {
      if (entry.instanceId === instanceId) {
        data.slots.delete(position);
        return inventoryOk(entry);
      }
    }
    return inventoryFail("entry_not_found");
  }

  moveEntry(entityId: EntityId, from: number, to: number): InventoryResult<InventoryEntry> {
    const data = this.#getData(entityId);
    if (!this.#isValidPosition(data, from) || !this.#isValidPosition(data, to)) {
      return inventoryFail("invalid_position");
    }
    const entry = data.slots.get(from);
    if (entry === undefined) {
      return inventoryFail("entry_not_found");
    }
    if (from === to) {
      return inventoryOk(entry);
    }
    if (data.slots.has(to)) {
      return inventoryFail("slot_occupied");
    }
    data.slots.delete(from);
    data.slots.set(to, entry);
    return inventoryOk(entry);
  }

  // Places an already-existing entry (preserving its instanceId) so items can
  // round-trip through external holders (equipment) without duplication.
  insertEntry(
    entityId: EntityId,
    entry: InventoryEntry,
    position?: number,
    mergeCompatible = false,
  ): InventoryResult<InventorySlot> {
    const data = this.#getData(entityId);

    if (this.#hasStoredInstanceId(entry.instanceId)) {
      return inventoryFail("duplicate_instance_id");
    }

    if (mergeCompatible) {
      const maxStack = effectiveMaxStack(this.#stackInfoFor(entry.itemId));
      if (maxStack > 1) {
        for (let candidatePosition = 0; candidatePosition < this.#capacityOf(data); candidatePosition += 1) {
          const candidate = data.slots.get(candidatePosition);
          if (
            candidate === undefined
            || !areEntriesStackCompatible(candidate, entry)
            || candidate.quantity + entry.quantity > maxStack
          ) {
            continue;
          }
          const mergedEntry = {
            ...candidate,
            quantity: candidate.quantity + entry.quantity,
          };
          data.slots.set(candidatePosition, mergedEntry);
          this.#observeInstanceId(data, entry.instanceId);
          return inventoryOk({ position: candidatePosition, entry: mergedEntry });
        }
      }
    }

    let targetPosition: number;
    if (position === undefined) {
      const free = this.#firstFreePosition(data);
      if (free === undefined) {
        return inventoryFail("inventory_full");
      }
      targetPosition = free;
    } else {
      if (!this.#isValidPosition(data, position)) {
        return inventoryFail("invalid_position");
      }
      if (data.slots.has(position)) {
        return inventoryFail("slot_occupied");
      }
      targetPosition = position;
    }

    this.#observeInstanceId(data, entry.instanceId);
    data.slots.set(targetPosition, entry);
    return inventoryOk({ position: targetPosition, entry });
  }

  /** True when an entry can return without consuming another inventory slot. */
  canMergeEntry(entityId: EntityId, entry: InventoryEntry): boolean {
    const data = this.#getData(entityId);
    const maxStack = effectiveMaxStack(this.#stackInfoFor(entry.itemId));
    if (maxStack <= 1) {
      return false;
    }
    for (const candidate of data.slots.values()) {
      if (
        areEntriesStackCompatible(candidate, entry)
        && candidate.quantity + entry.quantity <= maxStack
      ) {
        return true;
      }
    }
    return false;
  }

  findEntryByInstanceId(
    entityId: EntityId,
    instanceId: ItemInstanceId,
  ): InventorySlot | undefined {
    const data = this.#getData(entityId);
    for (const [position, entry] of data.slots) {
      if (entry.instanceId === instanceId) {
        return { position, entry };
      }
    }
    return undefined;
  }

  findEntriesByItemId(entityId: EntityId, itemId: string): readonly InventorySlot[] {
    const data = this.#getData(entityId);
    const matches: InventorySlot[] = [];
    for (const [position, entry] of data.slots) {
      if (entry.itemId === itemId) {
        matches.push({ position, entry });
      }
    }
    matches.sort((a, b) => a.position - b.position);
    return matches;
  }

  /**
   * Authoritative capacity preview for the same stack rules used by addQuantity.
   * `releasedPositions` represents occupied slots that a transaction will
   * release before inserting the item (for example consumed craft inputs).
   */
  canAcceptQuantity(
    entityId: EntityId,
    itemId: string,
    quantity: number,
    enchantment: EnchantmentLevel = 0,
    releasedPositions: readonly number[] = [],
  ): boolean {
    if (
      !Number.isInteger(quantity)
      || quantity <= 0
    ) {
      return false;
    }

    const data = this.#getData(entityId);
    const released = new Set(
      releasedPositions.filter(
        (position) => this.#isValidPosition(data, position) && data.slots.has(position),
      ),
    );
    const maxStack = effectiveMaxStack(this.#stackInfoFor(itemId));
    let availableCapacity = (
      this.#capacityOf(data) - data.slots.size + released.size
    ) * maxStack;

    if (maxStack > 1) {
      for (const [position, entry] of data.slots) {
        if (released.has(position)) continue;
        if (areEntriesStackCompatible(entry, { itemId, enchantment })) {
          availableCapacity += Math.max(0, maxStack - entry.quantity);
        }
      }
    }

    return availableCapacity >= quantity;
  }

  addQuantity(
    entityId: EntityId,
    itemId: string,
    quantity: number,
    stackInfo?: ItemStackInfoLike,
    enchantment: EnchantmentLevel = 0,
  ): InventoryResult<AddQuantityOutcome> {
    const data = this.#getData(entityId);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return inventoryFail("invalid_quantity");
    }
    const maxStack = effectiveMaxStack(this.#stackInfoFor(itemId, stackInfo));

    // Normalize legacy or previously capped partial stacks before receiving
    // new items. Item provenance (loot, vendor, craft...) never participates
    // in stack identity: only itemId + enchantment do.
    if (maxStack > 1) {
      let targetPosition: number | undefined;
      const capacity = this.#capacityOf(data);
      for (let position = 0; position < capacity; position += 1) {
        const entry = data.slots.get(position);
        if (
          entry === undefined
          || !areEntriesStackCompatible(entry, { itemId, enchantment })
        ) {
          continue;
        }
        if (targetPosition === undefined) {
          targetPosition = position;
          continue;
        }
        const target = data.slots.get(targetPosition);
        if (target === undefined || target.quantity >= maxStack) {
          targetPosition = position;
          continue;
        }
        const moved = Math.min(maxStack - target.quantity, entry.quantity);
        data.slots.set(targetPosition, { ...target, quantity: target.quantity + moved });
        if (moved === entry.quantity) {
          data.slots.delete(position);
        } else {
          data.slots.set(position, { ...entry, quantity: entry.quantity - moved });
          targetPosition = position;
        }
      }
    }

    let remaining = quantity;
    const affectedPositions: number[] = [];

    const capacity = this.#capacityOf(data);
    if (maxStack > 1) {
      for (let position = 0; position < capacity && remaining > 0; position += 1) {
        const entry = data.slots.get(position);
        if (
          entry === undefined
          || !areEntriesStackCompatible(entry, { itemId, enchantment })
          || entry.quantity >= maxStack
        ) {
          continue;
        }
        const toAdd = Math.min(maxStack - entry.quantity, remaining);
        data.slots.set(position, { ...entry, quantity: entry.quantity + toAdd });
        remaining -= toAdd;
        affectedPositions.push(position);
      }
    }

    for (let position = 0; position < capacity && remaining > 0; position += 1) {
      if (data.slots.has(position)) {
        continue;
      }
      const toAdd = Math.min(maxStack, remaining);
      data.slots.set(position, {
        instanceId: this.#allocateInstanceId(data),
        itemId,
        quantity: toAdd,
        enchantment,
      });
      remaining -= toAdd;
      affectedPositions.push(position);
    }

    if (remaining === quantity) {
      return inventoryFail("inventory_full");
    }
    return inventoryOk({
      requested: quantity,
      added: quantity - remaining,
      remainder: remaining,
      affectedPositions,
    });
  }

  // All-or-nothing per 13_ITEM_SYSTEM §19: a removal either completes fully
  // or fails without modifying stored quantities.
  removeQuantity(
    entityId: EntityId,
    itemId: string,
    quantity: number,
    enchantment: EnchantmentLevel = 0,
  ): InventoryResult<RemoveQuantityOutcome> {
    const data = this.#getData(entityId);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return inventoryFail("invalid_quantity");
    }
    let available = 0;
    for (const entry of data.slots.values()) {
      if (areEntriesStackCompatible(entry, { itemId, enchantment })) {
        available += entry.quantity;
      }
    }
    if (available < quantity) {
      return inventoryFail("insufficient_quantity");
    }

    let remaining = quantity;
    const emptiedPositions: number[] = [];
    for (let position = 0; position < this.#capacityOf(data) && remaining > 0; position += 1) {
      const entry = data.slots.get(position);
      if (
        entry === undefined
        || !areEntriesStackCompatible(entry, { itemId, enchantment })
      ) {
        continue;
      }
      const toRemove = Math.min(entry.quantity, remaining);
      remaining -= toRemove;
      if (toRemove === entry.quantity) {
        data.slots.delete(position);
        emptiedPositions.push(position);
      } else {
        data.slots.set(position, { ...entry, quantity: entry.quantity - toRemove });
      }
    }
    return inventoryOk({ removed: quantity, emptiedPositions });
  }

  getTotalQuantity(
    entityId: EntityId,
    itemId: string,
    enchantment: EnchantmentLevel = 0,
  ): number {
    const data = this.#getData(entityId);
    let total = 0;
    for (const entry of data.slots.values()) {
      if (areEntriesStackCompatible(entry, { itemId, enchantment })) {
        total += entry.quantity;
      }
    }
    return total;
  }

  /**
   * Changes the enchantment variant of exactly one item without changing its
   * runtime identity. Stacked equipment is split atomically: the upgraded
   * instance moves to a free slot and the remaining stack stays in place.
   */
  changeOneEnchantmentAt(
    entityId: EntityId,
    position: number,
    enchantment: EnchantmentLevel,
  ): InventoryResult<InventorySlot> {
    const data = this.#getData(entityId);
    if (!this.#isValidPosition(data, position)) {
      return inventoryFail("invalid_position");
    }
    const entry = data.slots.get(position);
    if (entry === undefined) {
      return inventoryFail("entry_not_found");
    }
    if (!isEnchantmentLevel(enchantment)) {
      return inventoryFail("invalid_quantity");
    }

    if (entry.quantity === 1) {
      const upgraded = { ...entry, enchantment };
      data.slots.set(position, upgraded);
      return inventoryOk({ position, entry: upgraded });
    }

    const targetPosition = this.#firstFreePosition(data);
    if (targetPosition === undefined) {
      return inventoryFail("inventory_full");
    }

    data.slots.set(position, {
      instanceId: this.#allocateInstanceId(data),
      itemId: entry.itemId,
      quantity: entry.quantity - 1,
      enchantment: getEnchantmentLevel(entry),
    });

    const upgraded: InventoryEntry = {
      ...entry,
      quantity: 1,
      enchantment,
    };
    data.slots.set(targetPosition, upgraded);
    return inventoryOk({ position: targetPosition, entry: upgraded });
  }

  mergeStacks(
    entityId: EntityId,
    fromPos: number,
    toPos: number,
    stackInfo?: ItemStackInfoLike,
  ): InventoryResult<MergeStacksOutcome> {
    const data = this.#getData(entityId);
    if (
      !this.#isValidPosition(data, fromPos) ||
      !this.#isValidPosition(data, toPos) ||
      fromPos === toPos
    ) {
      return inventoryFail("invalid_position");
    }
    const from = data.slots.get(fromPos);
    const to = data.slots.get(toPos);
    if (from === undefined || to === undefined) {
      return inventoryFail("entry_not_found");
    }
    if (!areEntriesStackCompatible(from, to)) {
      return inventoryFail("stack_incompatible");
    }
    const info = this.#stackInfoFor(from.itemId, stackInfo);
    if (info === undefined || !info.stackable) {
      return inventoryFail("not_stackable");
    }
    const maxStack = effectiveMaxStack(info);
    const space = maxStack - to.quantity;
    if (space <= 0) {
      return inventoryFail("stack_full");
    }
    const moved = Math.min(space, from.quantity);
    data.slots.set(toPos, { ...to, quantity: to.quantity + moved });
    const sourceEmptied = moved === from.quantity;
    if (sourceEmptied) {
      data.slots.delete(fromPos);
    } else {
      data.slots.set(fromPos, { ...from, quantity: from.quantity - moved });
    }
    return inventoryOk({ moved, sourceEmptied });
  }

  splitStack(
    entityId: EntityId,
    fromPos: number,
    toPos: number,
    quantity: number,
    stackInfo?: ItemStackInfoLike,
  ): InventoryResult<InventoryEntry> {
    const data = this.#getData(entityId);
    if (
      !this.#isValidPosition(data, fromPos) ||
      !this.#isValidPosition(data, toPos) ||
      fromPos === toPos
    ) {
      return inventoryFail("invalid_position");
    }
    const from = data.slots.get(fromPos);
    if (from === undefined) {
      return inventoryFail("entry_not_found");
    }
    if (data.slots.has(toPos)) {
      return inventoryFail("slot_occupied");
    }
    const info = this.#stackInfoFor(from.itemId, stackInfo);
    if (info === undefined || !info.stackable) {
      return inventoryFail("not_stackable");
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity >= from.quantity) {
      return inventoryFail("invalid_quantity");
    }
    const newEntry: InventoryEntry = {
      instanceId: this.#allocateInstanceId(data),
      itemId: from.itemId,
      quantity,
      enchantment: getEnchantmentLevel(from),
    };
    data.slots.set(fromPos, { ...from, quantity: from.quantity - quantity });
    data.slots.set(toPos, newEntry);
    return inventoryOk(newEntry);
  }

  /** Item currently occupying the Bag Slot (12_INVENTORY §3/§5). */
  getActiveBag(entityId: EntityId): InventoryEntry | undefined {
    return this.#getData(entityId).activeBag;
  }

  /**
   * Moves a bag from an inventory slot to the dedicated Bag Slot
   * (12_INVENTORY §5). Any previously active bag returns to the vacated slot,
   * so no item is ever lost (§13). Fails with `capacity_exceeded` when the
   * change would strand items beyond the new capacity (§13: capacity is never
   * exceeded).
   */
  equipBagFromSlot(entityId: EntityId, position: number): InventoryResult<BagChangeOutcome> {
    const data = this.#getData(entityId);
    if (!this.#isValidPosition(data, position)) {
      return inventoryFail("invalid_position");
    }
    const entry = data.slots.get(position);
    if (entry === undefined) {
      return inventoryFail("entry_not_found");
    }
    const bagInfo = this.#resolveBagInfo?.(entry.itemId);
    if (bagInfo === undefined) {
      return inventoryFail("not_a_bag");
    }
    if (entry.quantity !== 1) {
      return inventoryFail("invalid_quantity");
    }
    const previousBag = data.activeBag;
    const newCapacity = data.capacity + bagInfo.capacityBonus;
    // Occupied positions after the swap: the source slot is either freed or
    // reoccupied by the previous bag; every other slot keeps its position.
    for (const occupied of data.slots.keys()) {
      if (occupied !== position && occupied >= newCapacity) {
        return inventoryFail("capacity_exceeded");
      }
    }
    if (previousBag !== undefined && position >= newCapacity) {
      return inventoryFail("capacity_exceeded");
    }
    data.slots.delete(position);
    data.activeBag = entry;
    if (previousBag !== undefined) {
      data.slots.set(position, previousBag);
    }
    return inventoryOk({
      activeBag: entry,
      previousBag,
      capacity: this.#capacityOf(data),
    });
  }

  /**
   * Returns the active bag to the inventory, reverting to the base capacity
   * (12_INVENTORY §4). Fails without modifying state when items occupy the
   * bonus slots or no free slot remains within the base capacity.
   */
  unequipBagToInventory(entityId: EntityId): InventoryResult<BagChangeOutcome> {
    const data = this.#getData(entityId);
    const bag = data.activeBag;
    if (bag === undefined) {
      return inventoryFail("no_active_bag");
    }
    const newCapacity = data.capacity;
    for (const occupied of data.slots.keys()) {
      if (occupied >= newCapacity) {
        return inventoryFail("capacity_exceeded");
      }
    }
    let target: number | undefined;
    for (let position = 0; position < newCapacity; position += 1) {
      if (!data.slots.has(position)) {
        target = position;
        break;
      }
    }
    if (target === undefined) {
      return inventoryFail("inventory_full");
    }
    data.activeBag = undefined;
    data.slots.set(target, bag);
    return inventoryOk({
      activeBag: undefined,
      previousBag: bag,
      capacity: this.#capacityOf(data),
    });
  }

  validateIntegrity(entityId: EntityId): string[] {
    return validateInventory(this.#getData(entityId), this.#resolveStackInfo, this.#resolveBagInfo);
  }

  /** Global invariant: one physical inventory identity may exist in only one inventory holder. */
  validateGlobalInstanceIds(): string[] {
    const seen = new Set<ItemInstanceId>();
    const errors: string[] = [];
    for (const entityId of this.#inventories) {
      const data = this.#getData(entityId);
      const entries = [
        ...data.slots.values(),
        ...(data.activeBag === undefined ? [] : [data.activeBag]),
      ];
      for (const entry of entries) {
        if (seen.has(entry.instanceId)) {
          errors.push(`Duplicate instance id across inventories: ${entry.instanceId}`);
        } else {
          seen.add(entry.instanceId);
        }
      }
    }
    return errors;
  }

  #stackInfoFor(itemId: string, explicit?: ItemStackInfoLike): ItemStackInfoLike | undefined {
    return explicit ?? this.#resolveStackInfo?.(itemId);
  }

  /** Restores a loaded inventory; reserved for the save provider. */
  _restore(entityId: EntityId, data: InventoryData): void {
    this.#world.setComponent(entityId, InventoryComponent, data);
    this.#inventories.add(entityId);
  }

  #getData(entityId: EntityId): InventoryData {
    return this.#world.getComponent(entityId, InventoryComponent);
  }

  #getGlobalNextInstanceCounter(): number {
    let nextCounter = 0;
    for (const inventoryId of this.#inventories) {
      const data = this.#getData(inventoryId);
      nextCounter = Math.max(nextCounter, data.nextInstanceCounter);
    }
    return nextCounter;
  }

  #allocateInstanceId(targetData: InventoryData): ItemInstanceId {
    let nextCounter = this.#getGlobalNextInstanceCounter();
    let instanceId = toItemInstanceId(nextCounter);
    while (this.#hasStoredInstanceId(instanceId)) {
      nextCounter += 1;
      instanceId = toItemInstanceId(nextCounter);
    }
    targetData.nextInstanceCounter = Math.max(targetData.nextInstanceCounter, nextCounter + 1);
    return instanceId;
  }

  #observeInstanceId(targetData: InventoryData, instanceId: ItemInstanceId): void {
    const match = /^item_(\d+)$/.exec(instanceId);
    const numericId = match?.[1] === undefined ? undefined : Number(match[1]);
    if (numericId === undefined || !Number.isSafeInteger(numericId)) return;
    targetData.nextInstanceCounter = Math.max(targetData.nextInstanceCounter, numericId + 1);
  }

  #hasStoredInstanceId(instanceId: ItemInstanceId): boolean {
    for (const inventoryId of this.#inventories) {
      const data = this.#getData(inventoryId);
      if (data.activeBag?.instanceId === instanceId) return true;
      for (const entry of data.slots.values()) {
        if (entry.instanceId === instanceId) return true;
      }
    }
    return false;
  }

  #isValidPosition(data: InventoryData, position: number): boolean {
    return Number.isInteger(position) && position >= 0 && position < this.#capacityOf(data);
  }

  /** Current capacity = base + active bag bonus (12_INVENTORY §4). */
  #capacityOf(data: InventoryData): number {
    if (data.activeBag === undefined) {
      return data.capacity;
    }
    const bonus = this.#resolveBagInfo?.(data.activeBag.itemId)?.capacityBonus ?? 0;
    return data.capacity + bonus;
  }

  #firstFreePosition(data: InventoryData): number | undefined {
    for (let position = 0; position < this.#capacityOf(data); position += 1) {
      if (!data.slots.has(position)) {
        return position;
      }
    }
    return undefined;
  }
}
