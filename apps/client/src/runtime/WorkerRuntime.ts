import type { EntityId } from "@game/core";
import { EventBus } from "@game/core";
import type {
  CurrencyService,
  ExperienceService,
  InventoryManager,
  MasteryId,
  WorkerDefinitionId,
  WorkerId,
  WorkerProfession,
  WorkerTaskDefinitionId,
  WalletId,
} from "@game/gameplay";
import {
  asMasteryId,
  WorkerAssignmentManager,
  WorkerExecutor,
  WorkerManager,
  WorkerRegistry,
  WorkerScheduler,
  WorkerTaskRegistry,
  type WorkerExecutionEventMap,
} from "@game/gameplay";

import {
  WORKER_DEFINITIONS,
  WORKER_DEFINITION_IDS,
  WORKER_TASK_DEFINITIONS,
  WORKER_TASK_IDS,
} from "../data/workerContentCatalog.js";
import {
  BIRCH_PLANK_RECIPE,
  COPPER_BAR_RECIPE,
  FINE_CLOTH_RECIPE,
  IRON_BAR_RECIPE,
  LINEN_CLOTH_RECIPE,
  PINE_PLANK_RECIPE,
  STURDY_LEATHER_RECIPE,
  THICK_LEATHER_RECIPE,
} from "../data/refiningRecipes.js";

const WORKER_RECRUITMENT_COST = 250;
const WORKER_CAPACITY = 4;

const WOODCUTTER_DEFINITION_ID = WORKER_DEFINITION_IDS.woodcutter;
const MINER_DEFINITION_ID = WORKER_DEFINITION_IDS.miner;
const SKINNER_DEFINITION_ID = WORKER_DEFINITION_IDS.skinner;
const FIBER_HARVESTER_DEFINITION_ID = WORKER_DEFINITION_IDS.fiberHarvester;

const GATHER_WOOD_TASK_ID = WORKER_TASK_IDS.wood;
const GATHER_COPPER_TASK_ID = WORKER_TASK_IDS.ore;
const GATHER_HIDE_TASK_ID = WORKER_TASK_IDS.hide;
const GATHER_FIBER_TASK_ID = WORKER_TASK_IDS.fiber;

const WOOD_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_wood");
const ORE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_ore");
const HIDE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_hide");
const FIBER_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_fiber");

export function getWorkerGatheringXpForTier(tier: number): number {
  return Math.max(1, Math.round(4 * (1.5 ** Math.max(0, tier - 3))));
}

export function getHeroGatheringXpFromWorkerForTier(tier: number): number {
  return Math.max(1, Math.round(2 * (1.5 ** Math.max(0, tier - 3))));
}

export interface WorkerSnapshot {
  readonly id: WorkerId;
  readonly displayName: string;
  readonly profession: WorkerProfession;
  readonly mastery: number;
}

export interface WorkerSessionSnapshot {
  readonly state: string;
  readonly getProgress: () => number;
  readonly totalTicks?: number;
}

export interface WorkerMasteryDetails {
  readonly masteryLevel: number;
  readonly currentThreshold: number;
  readonly nextThreshold: number;
  readonly speedModifier: number;
}

export interface WorkerClientSaveData {
  readonly profession: WorkerProfession;
  readonly displayName: string;
  readonly mastery: number;
  readonly productionTier: 3 | 4;
  readonly state: "idle" | "working" | "paused";
  readonly elapsedTicks: number;
}

export type RecruitWorkerResult =
  | { readonly ok: true; readonly workerId: WorkerId; readonly displayName: string; readonly profession: WorkerProfession }
  | { readonly ok: false; readonly reason: "unsupported_profession" | "already_recruited" | "capacity_reached" | "insufficient_funds" | "creation_failed" | "assignment_failed"; readonly profession: WorkerProfession };

export type ToggleWorkerResult =
  | { readonly ok: true; readonly action: "started" | "paused" | "resumed" | "restarted"; readonly profession: WorkerProfession }
  | { readonly ok: false; readonly reason: "not_found" | "mastery_locked" | "execution_failed"; readonly profession: WorkerProfession };

export interface WorkerCycleCompletionEvent {
  readonly workerId: WorkerId;
  readonly profession: WorkerProfession;
  readonly assignedTier: 3 | 4;
  readonly itemId: string;
  readonly yieldQuantity: number;
  readonly addedToInventory: boolean;
  readonly workerMasteryGained: number;
  readonly heroMasteryId: MasteryId;
  readonly heroMasteryXpGained: number;
}

export type WorkerDomainEvent =
  | { readonly type: "recruit_success"; readonly workerId: WorkerId; readonly displayName: string; readonly profession: WorkerProfession }
  | { readonly type: "recruit_insufficient_funds"; readonly profession: WorkerProfession }
  | { readonly type: "storage_full"; readonly workerId: WorkerId; readonly profession: WorkerProfession; readonly assignedTier: 3 | 4 };

export interface WorkerRuntimeDependencies {
  readonly inventoryManager: InventoryManager;
  /** @deprecated Production resources should use productionStorageId. */
  readonly heroId?: EntityId;
  readonly productionStorageId?: EntityId;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly experienceService: ExperienceService;
  readonly getProductionTier: () => 3 | 4;
  readonly getRequiredGatheringMasteryForTier: (tier: number) => number;
}

export class WorkerRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly productionStorageId: EntityId;
  private readonly currencyService: CurrencyService;
  private readonly walletId: WalletId;
  private readonly experienceService: ExperienceService;
  private readonly getProductionTier: () => 3 | 4;
  private readonly getRequiredGatheringMasteryForTier: (tier: number) => number;

  private readonly workerRegistry: WorkerRegistry;
  private readonly workerManager: WorkerManager;
  private readonly workerTaskRegistry: WorkerTaskRegistry;
  private readonly workerAssignmentManager: WorkerAssignmentManager;
  private readonly workerExecutionEvents: EventBus<WorkerExecutionEventMap>;
  private readonly workerExecutor: WorkerExecutor;
  private readonly workerScheduler: WorkerScheduler;

  private readonly workerByProfession = new Map<WorkerProfession, WorkerId>();
  private readonly workerProductionTier = new Map<WorkerId, 3 | 4>();

  private readonly cycleCompletionListeners = new Set<(evt: WorkerCycleCompletionEvent) => void>();
  private readonly domainEventListeners = new Set<(evt: WorkerDomainEvent) => void>();

  private readonly workerTaskByProfession = {
    woodcutter: GATHER_WOOD_TASK_ID,
    miner: GATHER_COPPER_TASK_ID,
    skinner: GATHER_HIDE_TASK_ID,
    fiber_harvester: GATHER_FIBER_TASK_ID,
  } as const;

  private readonly workerDefinitionByProfession = {
    woodcutter: WOODCUTTER_DEFINITION_ID,
    miner: MINER_DEFINITION_ID,
    skinner: SKINNER_DEFINITION_ID,
    fiber_harvester: FIBER_HARVESTER_DEFINITION_ID,
  } as const;

  public constructor(deps: WorkerRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    const storageId = deps.productionStorageId ?? deps.heroId;
    if (storageId === undefined) throw new Error("WorkerRuntime requires production storage");
    this.productionStorageId = storageId;
    this.currencyService = deps.currencyService;
    this.walletId = deps.walletId;
    this.experienceService = deps.experienceService;
    this.getProductionTier = deps.getProductionTier;
    this.getRequiredGatheringMasteryForTier = deps.getRequiredGatheringMasteryForTier;

    this.workerRegistry = new WorkerRegistry();
    for (const definition of WORKER_DEFINITIONS) {
      this.workerRegistry.register(definition);
    }

    this.workerManager = new WorkerManager(this.workerRegistry);
    this.workerTaskRegistry = new WorkerTaskRegistry();
    for (const definition of WORKER_TASK_DEFINITIONS) {
      this.workerTaskRegistry.register(definition);
    }

    this.workerAssignmentManager = new WorkerAssignmentManager(
      this.workerManager,
      this.workerTaskRegistry,
    );
    this.workerExecutionEvents = new EventBus<WorkerExecutionEventMap>();
    this.workerExecutor = new WorkerExecutor(
      this.workerManager,
      this.workerAssignmentManager,
      this.workerTaskRegistry,
      this.workerExecutionEvents,
    );
    this.workerScheduler = new WorkerScheduler(this.workerExecutionEvents);
  }

  public subscribeCycleCompleted(listener: (evt: WorkerCycleCompletionEvent) => void): () => void {
    this.cycleCompletionListeners.add(listener);
    return () => {
      this.cycleCompletionListeners.delete(listener);
    };
  }

  public subscribeDomainEvent(listener: (evt: WorkerDomainEvent) => void): () => void {
    this.domainEventListeners.add(listener);
    return () => {
      this.domainEventListeners.delete(listener);
    };
  }

  private notifyCycleCompleted(evt: WorkerCycleCompletionEvent): void {
    for (const listener of this.cycleCompletionListeners) {
      listener(evt);
    }
  }

  private notifyDomainEvent(evt: WorkerDomainEvent): void {
    for (const listener of this.domainEventListeners) {
      listener(evt);
    }
  }

  public isSupportedWorkerProfession(profession: string): profession is keyof typeof this.workerTaskByProfession {
    return Object.prototype.hasOwnProperty.call(this.workerTaskByProfession, profession);
  }

  private workerRawItemId(profession: WorkerProfession, tier: 3 | 4): string {
    switch (profession) {
      case "woodcutter": return tier === 4 ? PINE_PLANK_RECIPE.rawItemId : BIRCH_PLANK_RECIPE.rawItemId;
      case "miner": return tier === 4 ? IRON_BAR_RECIPE.rawItemId : COPPER_BAR_RECIPE.rawItemId;
      case "stonecutter": return "item_resource_stone_t3";
      case "skinner": return tier === 4 ? THICK_LEATHER_RECIPE.rawItemId : STURDY_LEATHER_RECIPE.rawItemId;
      case "fiber_harvester": return tier === 4 ? FINE_CLOTH_RECIPE.rawItemId : LINEN_CLOTH_RECIPE.rawItemId;
    }
  }

  private workerMasteryId(profession: WorkerProfession): MasteryId {
    switch (profession) {
      case "woodcutter": return WOOD_GATHERING_MASTERY_ID;
      case "miner": return ORE_GATHERING_MASTERY_ID;
      case "stonecutter": return ORE_GATHERING_MASTERY_ID;
      case "skinner": return HIDE_GATHERING_MASTERY_ID;
      case "fiber_harvester": return FIBER_GATHERING_MASTERY_ID;
    }
  }

  private workerTaskForProfession(profession: keyof typeof this.workerTaskByProfession): WorkerTaskDefinitionId {
    return this.workerTaskByProfession[profession];
  }

  private workerDefinitionForProfession(profession: keyof typeof this.workerDefinitionByProfession): WorkerDefinitionId {
    return this.workerDefinitionByProfession[profession];
  }

  public getWorkerMasteryLevel(masteryXp: number): number {
    return Math.min(100, Math.floor(Math.sqrt(Math.max(0, masteryXp) / 100)));
  }

  public getWorkerMasteryThreshold(level: number): number {
    return Math.max(0, level) ** 2 * 100;
  }

  public getWorkerSpeedModifier(masteryXp: number, tier: 3 | 4): number {
    const level = this.getWorkerMasteryLevel(masteryXp);
    const tierModifier = tier === 4 ? 0.75 : 1;
    return tierModifier * (1 + level * 0.005);
  }

  public getAllWorkers(): readonly WorkerSnapshot[] {
    return this.workerManager.getAllWorkers();
  }

  public getWorkerSession(workerId: WorkerId): WorkerSessionSnapshot | undefined {
    return this.workerScheduler.getSession(workerId);
  }

  public hasActiveWorkerSession(): boolean {
    for (const session of this.workerScheduler.getAllSessions()) {
      if (session.state === "executing") {
        return true;
      }
    }
    return false;
  }

  public getAssignedTier(workerId: WorkerId): 3 | 4 {
    return this.workerProductionTier.get(workerId) ?? this.getProductionTier();
  }

  public getWorkerMasteryDetails(masteryXp: number, tier: 3 | 4): WorkerMasteryDetails {
    const masteryLevel = this.getWorkerMasteryLevel(masteryXp);
    return {
      masteryLevel,
      currentThreshold: this.getWorkerMasteryThreshold(masteryLevel),
      nextThreshold: this.getWorkerMasteryThreshold(masteryLevel + 1),
      speedModifier: this.getWorkerSpeedModifier(masteryXp, tier),
    };
  }

  public startWorkerCycle(
    workerId: WorkerId,
    assignedTier: 3 | 4 = this.getProductionTier(),
  ): boolean {
    const worker = this.workerManager.getWorker(workerId);
    if (
      worker === undefined
      || !this.isSupportedWorkerProfession(worker.profession)
      || this.getWorkerMasteryLevel(worker.mastery)
        < this.getRequiredGatheringMasteryForTier(assignedTier)
    ) {
      return false;
    }
    const result = this.workerExecutor.startExecution(
      workerId,
      this.workerTaskForProfession(worker.profession),
      this.getWorkerSpeedModifier(worker.mastery, assignedTier),
    );
    if (!result.ok) return false;
    this.workerProductionTier.set(workerId, assignedTier);
    this.workerScheduler.addSession(result.session);
    this.workerManager.updateState(workerId, "working");
    return true;
  }

  public recruitWorker(profession: WorkerProfession): RecruitWorkerResult {
    if (
      !this.isSupportedWorkerProfession(profession)
      || this.workerByProfession.has(profession)
      || this.workerManager.getAllWorkers().length >= WORKER_CAPACITY
    ) {
      return { ok: false, reason: "capacity_reached", profession };
    }

    const payment = this.currencyService.debit(
      this.walletId,
      "currency_silver",
      WORKER_RECRUITMENT_COST,
      "Worker",
    );
    if (!payment.ok) {
      this.notifyDomainEvent({
        type: "recruit_insufficient_funds",
        profession,
      });
      return { ok: false, reason: "insufficient_funds", profession };
    }

    const created = this.workerManager.createWorker(
      this.workerDefinitionForProfession(profession),
    );
    if (!created.ok) {
      this.currencyService.credit(
        this.walletId,
        "currency_silver",
        WORKER_RECRUITMENT_COST,
      );
      return { ok: false, reason: "creation_failed", profession };
    }

    const taskId = this.workerTaskForProfession(profession);
    const assigned = this.workerAssignmentManager.assign(created.worker.id, taskId);
    if (!assigned.ok) {
      this.workerManager.removeWorker(created.worker.id);
      this.currencyService.credit(
        this.walletId,
        "currency_silver",
        WORKER_RECRUITMENT_COST,
      );
      return { ok: false, reason: "assignment_failed", profession };
    }

    this.workerByProfession.set(profession, created.worker.id);
    this.workerManager.updateState(created.worker.id, "assigned");

    this.notifyDomainEvent({
      type: "recruit_success",
      workerId: created.worker.id,
      displayName: created.worker.displayName,
      profession,
    });

    return {
      ok: true,
      workerId: created.worker.id,
      displayName: created.worker.displayName,
      profession,
    };
  }

  public toggleWorker(profession: WorkerProfession): ToggleWorkerResult {
    const workerId = this.workerByProfession.get(profession);
    if (workerId === undefined) {
      return { ok: false, reason: "not_found", profession };
    }
    const session = this.workerScheduler.getSession(workerId);
    const currentGlobalTier = this.getProductionTier();

    if (session?.state === "executing") {
      const assignedTier = this.workerProductionTier.get(workerId) ?? currentGlobalTier;
      if (assignedTier !== currentGlobalTier) {
        this.workerScheduler.removeSession(workerId);
        this.workerManager.updateState(workerId, "assigned");
        const restarted = this.startWorkerCycle(workerId, currentGlobalTier);
        return restarted
          ? { ok: true, action: "restarted", profession }
          : { ok: false, reason: "execution_failed", profession };
      }
      session.pause();
      this.workerManager.updateState(workerId, "assigned");
      return { ok: true, action: "paused", profession };
    }

    if (session?.state === "paused") {
      const assignedTier = this.workerProductionTier.get(workerId) ?? currentGlobalTier;
      if (assignedTier !== currentGlobalTier) {
        this.workerScheduler.removeSession(workerId);
        this.workerManager.updateState(workerId, "assigned");
        const restarted = this.startWorkerCycle(workerId, currentGlobalTier);
        return restarted
          ? { ok: true, action: "restarted", profession }
          : { ok: false, reason: "execution_failed", profession };
      }
      session.resume();
      this.workerManager.updateState(workerId, "working");
      return { ok: true, action: "resumed", profession };
    }

    const started = this.startWorkerCycle(workerId);
    return started
      ? { ok: true, action: "started", profession }
      : { ok: false, reason: "execution_failed", profession };
  }

  public getSaveState(): readonly WorkerClientSaveData[] {
    return this.workerManager.getAllWorkers()
      .filter((worker) => this.isSupportedWorkerProfession(worker.profession))
      .map((worker) => {
        const profession = worker.profession as WorkerProfession;
        const session = this.workerScheduler.getSession(worker.id);
        return {
          profession,
          displayName: worker.displayName,
          mastery: worker.mastery,
          productionTier: this.workerProductionTier.get(worker.id) ?? this.getProductionTier(),
          state: session?.state === "executing"
            ? "working"
            : session?.state === "paused"
              ? "paused"
              : "idle",
          elapsedTicks: session?.elapsedTicks ?? 0,
        };
      });
  }

  public restoreSaveState(data: unknown): void {
    for (const worker of this.workerManager.getAllWorkers()) {
      this.workerScheduler.removeSession(worker.id);
      if (this.workerAssignmentManager.getAssignment(worker.id) !== undefined) {
        this.workerAssignmentManager.unassign(worker.id);
      }
      this.workerManager.removeWorker(worker.id);
    }
    this.workerByProfession.clear();
    this.workerProductionTier.clear();

    if (!Array.isArray(data)) {
      return;
    }

    for (const raw of data as WorkerClientSaveData[]) {
      if (!this.isSupportedWorkerProfession(raw.profession)) continue;
      const created = this.workerManager.createWorker(
        this.workerDefinitionForProfession(raw.profession),
        raw.displayName,
      );
      if (!created.ok) continue;
      this.workerManager.addMastery(created.worker.id, Math.max(0, raw.mastery));
      const assigned = this.workerAssignmentManager.assign(
        created.worker.id,
        this.workerTaskForProfession(raw.profession),
      );
      if (!assigned.ok) continue;
      this.workerByProfession.set(raw.profession, created.worker.id);
      const savedTier = raw.productionTier === 4 ? 4 : 3;
      this.workerProductionTier.set(created.worker.id, savedTier);
      this.workerManager.updateState(created.worker.id, "assigned");

      if (raw.state !== "idle" && this.startWorkerCycle(created.worker.id, savedTier)) {
        const session = this.workerScheduler.getSession(created.worker.id);
        const elapsed = Math.min(
          Math.max(0, raw.elapsedTicks),
          Math.max(0, (session?.totalTicks ?? 1) - 1),
        );
        for (let index = 0; index < elapsed; index += 1) {
          session?.tick();
        }
        if (raw.state === "paused") {
          session?.pause();
          this.workerManager.updateState(created.worker.id, "assigned");
        }
      }
    }
  }

  public tick(_tickCounter: number): void {
    this.workerScheduler.tickAll();
    this.processCompletedWorkerCycles();
  }

  private processCompletedWorkerCycles(): void {
    for (const session of this.workerScheduler.getAllSessions()) {
      if (!session.isComplete()) continue;
      const result = session.produceResult();
      const worker = this.workerManager.getWorker(session.workerId);
      this.workerScheduler.removeSession(session.workerId);
      if (!result.ok || worker === undefined) continue;

      const assignedTier = this.workerProductionTier.get(worker.id) ?? 3;
      if (!this.isSupportedWorkerProfession(worker.profession)) {
        this.workerManager.updateState(worker.id, "assigned");
        continue;
      }
      const profession = worker.profession;
      const itemId = this.workerRawItemId(profession, assignedTier);
      const added = this.inventoryManager.addQuantity(
        this.productionStorageId,
        itemId,
        result.yield,
        { itemId, stackable: true, maxStack: 999 },
      );

      if (!added.ok) {
        this.startWorkerCycle(worker.id, assignedTier);
        this.notifyDomainEvent({
          type: "storage_full",
          workerId: worker.id,
          profession,
          assignedTier,
        });
        this.notifyCycleCompleted({
          workerId: worker.id,
          profession,
          assignedTier,
          itemId,
          yieldQuantity: result.yield,
          addedToInventory: false,
          workerMasteryGained: 0,
          heroMasteryId: this.workerMasteryId(profession),
          heroMasteryXpGained: 0,
        });
        continue;
      }

      const workerMasteryGained = result.masteryGained * getWorkerGatheringXpForTier(assignedTier);
      this.workerManager.addMastery(worker.id, workerMasteryGained);

      const heroMasteryId = this.workerMasteryId(profession);
      const heroMasteryXpGained = result.masteryGained * getHeroGatheringXpFromWorkerForTier(assignedTier);
      this.experienceService.addExperience(
        heroMasteryId,
        heroMasteryXpGained,
        "gathering",
      );

      this.startWorkerCycle(worker.id, assignedTier);

      this.notifyCycleCompleted({
        workerId: worker.id,
        profession,
        assignedTier,
        itemId,
        yieldQuantity: result.yield,
        addedToInventory: true,
        workerMasteryGained,
        heroMasteryId,
        heroMasteryXpGained,
      });
    }
  }
}
