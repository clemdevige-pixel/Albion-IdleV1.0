import type { EventBus, Unsubscribe } from "@game/core";
import type { ExperienceService } from "../experience/experience-service.js";
import type { ExperienceEventMap, LevelUpEvent } from "../experience/experience-events.js";
import type { FameService } from "../fame/fame-service.js";
import type { FameCategory, FameResult } from "../fame/types.js";
import type { FameAwardValue } from "../fame/fame-service.js";
import type { MasteryService } from "../mastery/mastery-service.js";
import type { MasteryState } from "../mastery/types.js";
import type { DestinyBoardService } from "../destiny-board/destiny-board-service.js";
import type { DestinyNodeId, DestinyNodeState, DestinyNodeDefinition } from "../destiny-board/types.js";
import type { MasteryId, MasteryProgress } from "../experience/types.js";
import type { FameRecord } from "../fame/types.js";
import type { ProgressionConfig } from "./types.js";

/** Snapshot of the full progression state. */
export interface FullProgressionState {
  readonly masteries: ReadonlyMap<MasteryId, MasteryState>;
  readonly experience: ReadonlyMap<MasteryId, MasteryProgress>;
  readonly totalFame: number;
  readonly fameHistory: readonly FameRecord[];
  readonly destinyNodes: ReadonlyMap<DestinyNodeId, { definition: DestinyNodeDefinition; state: DestinyNodeState }>;
  readonly unlockedDestinyNodes: readonly DestinyNodeId[];
  readonly overflowPool: number;
}

/**
 * Wires the four progression systems together:
 * ExperienceService, FameService, MasteryService, DestinyBoardService.
 *
 * Subscribes to LevelUp events to auto-check and unlock eligible destiny nodes.
 */
export class ProgressionOrchestrator {
  private unsubscribeLevelUp: Unsubscribe | undefined;

  constructor(
    private readonly experienceService: ExperienceService,
    private readonly fameService: FameService,
    private readonly masteryService: MasteryService,
    private readonly destinyBoardService: DestinyBoardService,
  ) {}

  /** Load all definitions and wire event subscriptions. */
  initialize(config: ProgressionConfig): void {
    // Load mastery definitions (also registers with ExperienceService)
    this.masteryService.loadDefinitions(config.masteryDefinitions);

    // Register destiny board nodes
    for (const node of config.destinyNodes) {
      this.destinyBoardService.registerNode(node);
    }

    // Set overflow config if provided
    if (config.overflowConfig !== undefined) {
      this.masteryService.setOverflowConfig(config.overflowConfig);
    }
  }

  /** Subscribe to LevelUp events from the experience bus to auto-unlock destiny nodes. */
  connectEventBus(experienceBus: EventBus<ExperienceEventMap>): void {
    this.unsubscribeLevelUp?.();
    this.unsubscribeLevelUp = experienceBus.subscribe("LevelUp", (_event: LevelUpEvent) => {
      this.tryAutoUnlockEligibleNodes();
    });
  }

  /**
   * Award fame to a mastery, then check and auto-unlock any newly eligible
   * destiny board nodes.
   */
  onFameEarned(
    masteryId: MasteryId,
    amount: number,
    category: FameCategory,
  ): FameResult<FameAwardValue> {
    const result = this.fameService.awardFame({
      targetMasteryId: masteryId,
      amount,
      category,
    });

    // After fame is awarded (which may level up via ExperienceService),
    // check destiny board eligibility.
    // Note: if eventBus is connected, LevelUp already triggers this,
    // but we call it here too for the case where no bus is connected.
    this.tryAutoUnlockEligibleNodes();

    return result;
  }

  /** Discover a mastery via MasteryService (e.g. on first equipment acquisition). */
  onEquipmentAcquired(masteryId: MasteryId): void {
    this.masteryService.discoverMastery(masteryId);
  }

  /** Returns a snapshot of all progression systems. */
  getFullProgressionState(): FullProgressionState {
    return {
      masteries: this.masteryService.getAllMasteries(),
      experience: this.experienceService.getAllProgress(),
      totalFame: this.fameService.getTotalFameEarned(),
      fameHistory: this.fameService.getFameHistory(),
      destinyNodes: this.destinyBoardService.getAllNodes(),
      unlockedDestinyNodes: this.destinyBoardService.getUnlockedNodes(),
      overflowPool: this.masteryService.getOverflowPool(),
    };
  }

  /** Check all eligible destiny nodes and auto-unlock them. */
  private tryAutoUnlockEligibleNodes(): void {
    // Loop until no more nodes can be unlocked (handles chains)
    let eligible = this.destinyBoardService.getEligibleNodes();
    while (eligible.length > 0) {
      let unlocked = false;
      for (const nodeId of eligible) {
        const result = this.destinyBoardService.tryUnlock(nodeId);
        if (result.ok) {
          unlocked = true;
        }
      }
      if (!unlocked) break;
      eligible = this.destinyBoardService.getEligibleNodes();
    }
  }

  /** Cleanup event subscriptions. */
  dispose(): void {
    this.unsubscribeLevelUp?.();
    this.unsubscribeLevelUp = undefined;
  }
}
