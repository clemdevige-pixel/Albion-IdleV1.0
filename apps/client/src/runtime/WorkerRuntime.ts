import type { EntityId } from "@game/core";
import { EventBus } from "@game/core";
import { getInitialIslandWorkerHouseLevelDefinition } from "@game/data";
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
import { getProductionRefiningRecipe } from "../data/refiningRecipes.js";
import {
  getHeroGatheringXpFromWorkerForTier,
  getWorkerGatheringXpForTier,
} from "../data/progressionContentCatalog.js";
import {
  getProductionFamilyByProfession,
  getProductionFamilyId,
  getProductionTierRules,
  isProductionTier,
  type ProductionTier,
} from "../data/productionFamilyCatalog.js";

export {
  getHeroGatheringXpFromWorkerForTier,
  getWorkerGatheringXpForTier,
} from "../data/progressionContentCatalog.js";

const WORKER_HOUSE_BASELINE = getInitialIslandWorkerHouseLevelDefinition();

type SupportedWorkerProfession = Extract<
  WorkerProfession,
  "woodcutter" | "miner" | "skinner" | "fiber_harvester"
>;

interface WorkerProfessionRuntimeDefinition {
  readonly definitionId: WorkerDefinitionId;
  readonly taskId: WorkerTaskDefinitionId;
}

const WORKER_PROFESSION_RUNTIME_DEFINITIONS = {
  woodcutter: {
    definitionId: WORKER_DEFINITION_IDS.woodcutter,
    taskId: WORKER_TASK_IDS.wood,
  },
  miner: {
    definitionId: WORKER_DEFINITION_IDS.miner,
    taskId: WORKER_TASK_IDS.ore,
  },
  skinner: {
    definitionId: WORKER_DEFINITION_IDS.skinner,
    taskId: WORKER_TASK_IDS.hide,
  },
  fiber_harvester: {
    definitionId: WORKER_DEFINITION_IDS.fiberHarvester,
    taskId: WORKER_TASK_IDS.fiber,
  },
} as const satisfies Record<
  SupportedWorkerProfession,
  WorkerProfessionRuntimeDefinition
>;

const SUPPORTED_WORKER_PROFESSIONS = new Set<string>(
  Object.keys(WORKER_PROFESSION_RUNTIME_DEFINITIONS),
);

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
  readonly productionTier: ProductionTier;
  readonly state: "idle" | "working" | "paused";
  readonly elapsedTicks: number;
}

export type RecruitWorkerResult =
  | { readonly ok: true; readonly workerId: WorkerId; readonly displayName: string; readonly profession: WorkerProfession }
  | { readonly ok: false; readonly reason: "unsupported_profession" | "already_recruited" | "capacity_reached" | "insufficient_funds" | "creation_failed" | "assignment_failed"; readonly profession: WorkerProfession };

export type ToggleWorkerResult =
  | { readonly ok: true; readonly action: "started" | "paused" | "resumed" | "restarted"; readonly workerId: WorkerId; readonly profession: WorkerProfession }
  | { readonly ok: false; readonly reason: "not_found" | "mastery_locked" | "execution_failed"; readonly workerId: WorkerId };

export interface WorkerCycleCompletionEvent {
  readonly workerId: WorkerId;
  readonly profession: WorkerProfession;
  readonly assignedTier: ProductionTier;
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
  | { readonly type: "storage_full"; readonly workerId: WorkerId; readonly profession: WorkerProfession; readonly assignedTier: ProductionTier };

export interface WorkerRuntimeDependencies {
  readonly inventoryManager: InventoryManager;
  /** @deprecated Production resources should use productionStorageId. */
  readonly heroId?: EntityId;
  readonly productionStorageId?: EntityId;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly experienceService: ExperienceService;
  readonly getProductionTier: () => ProductionTier;
  readonly getRequiredGatheringMasteryForTier: (tier: number) => number;
  readonly getWorkerCapacity?: () => number;
  readonly getWorkerProfessionCapacity?: (profession: WorkerProfession) => number;
  readonly getWorkerRecruitmentCost?: () => number;
}

export class WorkerRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly productionStorageId: EntityId;
  private readonly currencyService: CurrencyService;
  private readonly walletId: WalletId;
  private readonly experienceService: ExperienceService;
  private readonly getProductionTier: () => ProductionTier;
  private readonly getRequiredGatheringMasteryForTier: (tier: number) => number;
  private readonly getWorkerCapacity: () => number;
  private readonly getWorkerProfessionCapacity: (profession: WorkerProfession) => number;
  private readonly getWorkerRecruitmentCost: () => number;

  private readonly workerRegistry: WorkerRegistry;
  private readonly workerManager: WorkerManager;
  private readonly workerTaskRegistry: WorkerTaskRegistry;
  private readonly workerAssignmentManager: WorkerAssignmentManager;
  private readonly workerExecutionEvents: EventBus<WorkerExecutionEventMap>;
  private readonly workerExecutor: WorkerExecutor;
  private readonly workerScheduler: WorkerScheduler;

  private readonly workerProductionTier = new Map<WorkerId, ProductionTier>();

  private readonly cycleCompletionListeners = new Set<(evt: WorkerCycleCompletionEvent) => void>();
  private readonly domainEventListeners = new Set<(evt: WorkerDomainEvent) => void>();

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
    this.getWorkerCapacity = deps.getWorkerCapacity ?? (() => WORKER_HOUSE_BASELINE.workerCapacity);
    this.getWorkerProfessionCapacity = deps.getWorkerProfessionCapacity ?? (() => 1);
    this.getWorkerRecruitmentCost = deps.getWorkerRecruitmentCost ?? (() => WORKER_HOUSE_BASELINE.recruitmentCost);

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
    for (const listener of this.cycleCompletionListeners) listener(evt);
  }

  private notifyDomainEvent(evt: WorkerDomainEvent): void {
    for (const listener of this.domainEventListeners) listener(evt);
  }

  public isSupportedWorkerProfession(profession: string): profession is SupportedWorkerProfession {
    return SUPPORTED_WORKER_PROFESSIONS.has(profession);
  }

  private getWorkerProfessionDefinition(profession: SupportedWorkerProfession): WorkerProfessionRuntimeDefinition {
    return WORKER_PROFESSION_RUNTIME_DEFINITIONS[profession];
  }

  private getWorkerProductionFamily(profession: SupportedWorkerProfession) {
    const definition = getProductionFamilyByProfession(profession);
    if (definition === undefined) {
      throw new Error(`Missing production family for supported worker profession: ${profession}`);
    }
    return definition;
  }

  private workerRawItemId(profession: SupportedWorkerProfession, tier: ProductionTier): string {
    const definition = this.getWorkerProductionFamily(profession);
    return getProductionRefiningRecipe(
      getProductionFamilyId(definition.gameplayFamily),
      tier,
    ).rawItemId;
  }

  private workerMasteryId(profession: SupportedWorkerProfession): MasteryId {
    return this.getWorkerProductionFamily(profession).masteryId;
  }

  private workerTaskForProfession(profession: SupportedWorkerProfession): WorkerTaskDefinitionId {
    return this.getWorkerProfessionDefinition(profession).taskId;
  }

  private workerDefinitionForProfession(profession: SupportedWorkerProfession): WorkerDefinitionId {
    return this.getWorkerProfessionDefinition(profession).definitionId;
  }

  public getWorkerMasteryLevel(masteryXp: number): number {
    return Math.min(100, Math.floor(Math.sqrt(Math.max(0, masteryXp) / 100)));
  }

  public getWorkerMasteryThreshold(level: number): number {
    return Math.max(0, level) ** 2 * 100;
  }

  public getWorkerSpeedModifier(masteryXp: number, tier: ProductionTier): number {
    const level = this.getWorkerMasteryLevel(masteryXp);
    const tierModifier = getProductionTierRules(tier).workerSpeedModifier;
    return tierModifier * (1 + level * 0.005);
  }

  public getAllWorkers(): readonly WorkerSnapshot[] {
    return this.workerManager.getAllWorkers();
  }

  public getWorkersByProfession(profession: WorkerProfession): readonly WorkerSnapshot[] {
    return this.workerManager.getWorkersByProfession(profession);
  }

  public getCapacity(): number {
    return this.getWorkerCapacity();
  }

  public getProfessionCapacity(profession: WorkerProfession): number {
    return this.getWorkerProfessionCapacity(profession);
  }

  public getRecruitmentCost(): number {
    return this.getWorkerRecruitmentCost();
  }

  public getWorkerSession(workerId: WorkerId): WorkerSessionSnapshot | undefined {
    return this.workerScheduler.getSession(workerId);
  }

  public hasActiveWorkerSession(): boolean {
    return this.workerScheduler.getAllSessions().some((session) => session.state === "executing");
  }

  public getAssignedTier(workerId: WorkerId): ProductionTier {
    return this.workerProductionTier.get(workerId) ?? this.getProductionTier();
  }

  public getWorkerMasteryDetails(masteryXp: number, tier: ProductionTier): WorkerMasteryDetails {
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
    assignedTier: ProductionTier = this.getProductionTier(),
  ): boolean {
    const worker = this.workerManager.getWorker(workerId);
    if (
      worker === undefined
      || !this.isSupportedWorkerProfession(worker.profession)
      || this.getWorkerMasteryLevel(worker.mastery) < this.getRequiredGatheringMasteryForTier(assignedTier)
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
    if (!this.isSupportedWorkerProfession(profession)) {
      return { ok: false, reason: "unsupported_profession", profession };
    }
    const professionCount = this.workerManager.getWorkersByProfession(profession).length;
    if (
      this.workerManager.getAllWorkers().length >= this.getWorkerCapacity()
      || professionCount >= this.getWorkerProfessionCapacity(profession)
    ) {
      return { ok: false, reason: "capacity_reached", profession };
    }

    const recruitmentCost = this.getWorkerRecruitmentCost();
    const payment = this.currencyService.debit(
      this.walletId,
      "currency_silver",
      recruitmentCost,
      "Worker",
    );
    if (!payment.ok) {
      this.notifyDomainEvent({ type: "recruit_insufficient_funds", profession });
      return { ok: false, reason: "insufficient_funds", profession };
    }

    const created = this.workerManager.createWorker(this.workerDefinitionForProfession(profession));
    if (!created.ok) {
      this.currencyService.credit(this.walletId, "currency_silver", recruitmentCost);
      return { ok: false, reason: "creation_failed", profession };
    }

    const taskId = this.workerTaskForProfession(profession);
    const assigned = this.workerAssignmentManager.assign(created.worker.id, taskId);
    if (!assigned.ok) {
      this.workerManager.removeWorker(created.worker.id);
      this.currencyService.credit(this.walletId, "currency_silver", recruitmentCost);
      return { ok: false, reason: "assignment_failed", profession };
    }

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

  private restartWorkerForTier(
    workerId: WorkerId,
    profession: SupportedWorkerProfession,
    tier: ProductionTier,
  ): ToggleWorkerResult {
    this.workerScheduler.removeSession(workerId);
    this.workerManager.updateState(workerId, "assigned");
    return this.startWorkerCycle(workerId, tier)
      ? { ok: true, action: "restarted", workerId, profession }
      : { ok: false, reason: "execution_failed", workerId };
  }

  public toggleWorker(
    workerId: WorkerId,
    tier: ProductionTier = this.getProductionTier(),
  ): ToggleWorkerResult {
    const worker = this.workerManager.getWorker(workerId);
    if (worker === undefined || !this.isSupportedWorkerProfession(worker.profession)) {
      return { ok: false, reason: "not_found", workerId };
    }
    const profession = worker.profession;
    if (this.getWorkerMasteryLevel(worker.mastery) < this.getRequiredGatheringMasteryForTier(tier)) {
      return { ok: false, reason: "mastery_locked", workerId };
    }
    const session = this.workerScheduler.getSession(workerId);

    if (session?.state === "executing") {
      const assignedTier = this.workerProductionTier.get(workerId) ?? tier;
      if (assignedTier !== tier) return this.restartWorkerForTier(workerId, profession, tier);
      session.pause();
      this.workerManager.updateState(workerId, "assigned");
      return { ok: true, action: "paused", workerId, profession };
    }

    if (session?.state === "paused") {
      const assignedTier = this.workerProductionTier.get(workerId) ?? tier;
      if (assignedTier !== tier) return this.restartWorkerForTier(workerId, profession, tier);
      session.resume();
      this.workerManager.updateState(workerId, "working");
      return { ok: true, action: "resumed", workerId, profession };
    }

    const started = this.startWorkerCycle(workerId, tier);
    return started
      ? { ok: true, action: "started", workerId, profession }
      : { ok: false, reason: "execution_failed", workerId };
  }

  public getSaveState(): readonly WorkerClientSaveData[] {
    return this.workerManager.getAllWorkers()
      .filter((worker) => this.isSupportedWorkerProfession(worker.profession))
      .map((worker) => {
        const session = this.workerScheduler.getSession(worker.id);
        return {
          profession: worker.profession,
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
    this.workerProductionTier.clear();

    if (!Array.isArray(data)) return;

    for (const raw of data as WorkerClientSaveData[]) {
      if (!this.isSupportedWorkerProfession(raw.profession)) continue;
      if (this.workerManager.getAllWorkers().length >= this.getWorkerCapacity()) break;
      if (
        this.workerManager.getWorkersByProfession(raw.profession).length
        >= this.getWorkerProfessionCapacity(raw.profession)
      ) continue;

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
      if (!assigned.ok) {
        this.workerManager.removeWorker(created.worker.id);
        continue;
      }
      const savedTier = isProductionTier(raw.productionTier)
        ? raw.productionTier
        : this.getProductionTier();
      this.workerProductionTier.set(created.worker.id, savedTier);
      this.workerManager.updateState(created.worker.id, "assigned");

      if (raw.state !== "idle" && this.startWorkerCycle(created.worker.id, savedTier)) {
        const session = this.workerScheduler.getSession(created.worker.id);
        const elapsed = Math.min(
          Math.max(0, raw.elapsedTicks),
          Math.max(0, (session?.totalTicks ?? 1) - 1),
        );
        for (let index = 0; index < elapsed; index += 1) session?.tick();
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
      this.experienceService.addExperience(heroMasteryId, heroMasteryXpGained, "gathering");

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
