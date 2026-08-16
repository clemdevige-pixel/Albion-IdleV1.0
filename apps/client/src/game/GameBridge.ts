import type { CombatState } from "@game/gameplay";
import {
  createInitialGameBridgeState,
  TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID,
  type ActiveEffectDisplay,
  type CombatAbilitiesVM,
  type ConsumablesVM,
  type CraftingVM,
  type EconomyNotificationVM,
  type EquipmentVM,
  type GameBridgeState,
  type GatheringVM,
  type InventoryVM,
  type IslandVM,
  type ProgressionVM,
  type RefiningVM,
  type RepairVM,
  type StatsVM,
  type TransactionEntryVM,
  type VendorVM,
  type WalletVM,
  type WorkersVM,
  type WorldVM,
} from "./bridge/GameBridgeModels";

export * from "./bridge/GameBridgeModels";

type BridgeListener = () => void;
type DamagePresentationSource = "auto_attack" | "ability" | "effect" | "other";

/**
 * Stable React/Phaser presentation bridge.
 *
 * Domain view-model contracts and initial state live in `bridge/` while this
 * class remains the small observable compatibility surface used by existing
 * consumers. Gameplay runtimes remain authoritative.
 */
export class GameBridge {
  #state: GameBridgeState = createInitialGameBridgeState();
  #nextDamageNumberId = 1;
  #notifyScheduled = false;
  readonly #listeners = new Set<BridgeListener>();

  get playerHealth(): number { return this.#state.playerHealth; }
  get playerMaxHealth(): number { return this.#state.playerMaxHealth; }
  get enemyHealth(): number { return this.#state.enemyHealth; }
  get enemyMaxHealth(): number { return this.#state.enemyMaxHealth; }
  get combatState(): CombatState { return this.#state.combatState; }
  get enemyName(): string { return this.#state.enemyName; }
  get enemyVisualManifestId(): string { return this.#state.enemyVisualManifestId; }
  get enemiesKilled(): number { return this.#state.enemiesKilled; }
  get zoneElapsed(): number { return this.#state.zoneElapsed; }
  get segmentSilverPerHour(): number { return this.#state.segmentSilverPerHour; }
  get segmentFamePerHour(): number { return this.#state.segmentFamePerHour; }
  get damageNumbers() { return this.#state.damageNumbers; }
  get activeEffects() { return this.#state.activeEffects; }
  get abilities() { return this.#state.abilities; }
  get consumables() { return this.#state.consumables; }
  get inventory() { return this.#state.inventory; }
  get bank() { return this.#state.bank; }
  get equipment() { return this.#state.equipment; }
  get stats() { return this.#state.stats; }
  get progression() { return this.#state.progression; }
  get wallet() { return this.#state.wallet; }
  get vendor() { return this.#state.vendor; }
  get repair() { return this.#state.repair; }
  get transactionHistory() { return this.#state.transactionHistory; }
  get economyNotifications() { return this.#state.economyNotifications; }
  get world() { return this.#state.world; }
  get queuedGatheringFamily(): string | null { return this.#state.queuedGatheringFamily; }
  get gathering() { return this.#state.gathering; }
  get oreGathering() { return this.#state.oreGathering; }
  get hideGathering() { return this.#state.hideGathering; }
  get fiberGathering() { return this.#state.fiberGathering; }
  get refining() { return this.#state.refining; }
  get metalRefining() { return this.#state.metalRefining; }
  get leatherRefining() { return this.#state.leatherRefining; }
  get clothRefining() { return this.#state.clothRefining; }
  get crafting() { return this.#state.crafting; }
  get workers() { return this.#state.workers; }
  get island() { return this.#state.island; }

  readonly subscribe = (listener: BridgeListener): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };

  updatePlayerHealth(current: number, max: number): void {
    this.#update({ playerHealth: current, playerMaxHealth: max });
  }

  updateEnemyHealth(current: number, max: number): void {
    this.#update({ enemyHealth: current, enemyMaxHealth: max });
  }

  clearEnemyPresentation(): void {
    this.#update({
      enemyHealth: 0,
      enemyMaxHealth: 0,
      enemyName: "",
      // Keep a valid technical manifest while the authoritative enemy is absent.
      // Presentation visibility is driven by enemyMaxHealth/name, not this fallback.
      enemyVisualManifestId: TECHNICAL_ENEMY_RENDER_FALLBACK_MANIFEST_ID,
      activeEffects: [],
    });
  }

  setCombatState(combatState: CombatState): void { this.#update({ combatState }); }

  addDamageNumber(
    amount: number,
    target: "player" | "enemy",
    abilityId?: string,
    sourceType: DamagePresentationSource = "other",
    targetHealthAfter?: number,
    encounterKey?: string,
  ): void {
    const damageNumbers = [
      ...this.#state.damageNumbers,
      {
        id: this.#nextDamageNumberId,
        amount,
        target,
        timestamp: Date.now(),
        sourceType,
        ...(targetHealthAfter === undefined ? {} : { targetHealthAfter }),
        ...(abilityId === undefined ? {} : { abilityId }),
        ...(encounterKey === undefined ? {} : { encounterKey }),
      },
    ].slice(-20);
    this.#nextDamageNumberId += 1;
    this.#update({ damageNumbers });
  }

  setEnemyPresentation(enemyName: string, enemyVisualManifestId: string): void {
    this.#update({ enemyName, enemyVisualManifestId });
  }

  incrementEnemiesKilled(): void {
    this.#update({ enemiesKilled: this.#state.enemiesKilled + 1 });
  }

  updateZoneElapsed(zoneElapsed: number): void { this.#update({ zoneElapsed }); }

  updateSegmentRates(segmentSilverPerHour: number, segmentFamePerHour: number): void {
    this.#update({ segmentSilverPerHour, segmentFamePerHour });
  }

  setActiveEffects(activeEffects: readonly ActiveEffectDisplay[]): void {
    this.#update({ activeEffects: [...activeEffects] });
  }

  updateAbilities(abilities: CombatAbilitiesVM): void { this.#update({ abilities }); }
  updateInventory(inventory: InventoryVM): void { this.#update({ inventory }); }
  updateBank(bank: InventoryVM): void { this.#update({ bank }); }
  updateEquipment(equipment: EquipmentVM): void { this.#update({ equipment }); }
  updateStats(stats: StatsVM): void { this.#update({ stats }); }
  updateProgression(progression: ProgressionVM): void { this.#update({ progression }); }
  updateWallet(wallet: WalletVM): void { this.#update({ wallet }); }
  updateVendor(vendor: VendorVM): void { this.#update({ vendor }); }
  updateRepair(repair: RepairVM): void { this.#update({ repair }); }

  addTransaction(entry: TransactionEntryVM): void {
    this.#update({ transactionHistory: [entry, ...this.#state.transactionHistory].slice(0, 50) });
  }

  addEconomyNotification(notification: EconomyNotificationVM): void {
    this.#update({
      economyNotifications: [notification, ...this.#state.economyNotifications].slice(0, 10),
    });
  }

  dismissEconomyNotification(id: string): void {
    this.#update({
      economyNotifications: this.#state.economyNotifications.filter((entry) => entry.id !== id),
    });
  }

  updateWorld(world: WorldVM): void { this.#update({ world }); }
  updateQueuedGatheringFamily(queuedGatheringFamily: string | null): void {
    this.#update({ queuedGatheringFamily });
  }
  updateGathering(gathering: GatheringVM): void { this.#update({ gathering }); }
  updateOreGathering(oreGathering: GatheringVM): void { this.#update({ oreGathering }); }
  updateHideGathering(hideGathering: GatheringVM): void { this.#update({ hideGathering }); }
  updateFiberGathering(fiberGathering: GatheringVM): void { this.#update({ fiberGathering }); }
  updateRefining(refining: RefiningVM): void { this.#update({ refining }); }
  updateMetalRefining(metalRefining: RefiningVM): void { this.#update({ metalRefining }); }
  updateLeatherRefining(leatherRefining: RefiningVM): void { this.#update({ leatherRefining }); }
  updateClothRefining(clothRefining: RefiningVM): void { this.#update({ clothRefining }); }
  updateCrafting(crafting: CraftingVM): void { this.#update({ crafting }); }
  updateWorkers(workers: WorkersVM): void { this.#update({ workers }); }
  updateIsland(island: IslandVM): void { this.#update({ island }); }
  updateConsumables(consumables: ConsumablesVM): void { this.#update({ consumables }); }

  readonly getSnapshot = (): GameBridgeState => this.#state;

  #update(patch: Partial<GameBridgeState>): void {
    this.#state = { ...this.#state, ...patch };
    if (this.#notifyScheduled) return;

    this.#notifyScheduled = true;
    queueMicrotask(() => {
      this.#notifyScheduled = false;
      for (const listener of this.#listeners) listener();
    });
  }
}
