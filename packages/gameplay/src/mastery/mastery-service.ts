import type { EventBus } from "@game/core";
import type { ExperienceService } from "../experience/experience-service.js";
import { ExperienceTable } from "../experience/experience-table.js";
import type { MasteryId } from "../experience/types.js";
import { asMasteryId } from "../experience/types.js";
import type { MasteryEventMap } from "./mastery-events.js";
import type {
  MasteryDefinitionLike,
  MasteryResult,
  MasteryState,
  OverflowConfig,
} from "./types.js";

const DEFAULT_OVERFLOW_CONFIG: OverflowConfig = {
  conversionRate: 1,
  enabled: false,
};

/**
 * Orchestrates mastery lifecycle (29_MASTERY_SYSTEM).
 *
 * Masteries are discovered when the player first obtains the corresponding
 * equipment. Once unlocked they are never re-locked. Overflow XP is generated
 * when a max-level mastery earns additional experience.
 */
export class MasteryService {
  private readonly unlocked = new Set<MasteryId>();
  private readonly definitions = new Map<MasteryId, MasteryDefinitionLike>();
  private readonly tables = new Map<MasteryId, ExperienceTable>();
  private overflowPool = 0;
  private overflowConfig: OverflowConfig = DEFAULT_OVERFLOW_CONFIG;
  private eventBus: EventBus<MasteryEventMap> | undefined;

  constructor(private readonly experienceService: ExperienceService) {}

  /** Optionally wire an event bus for UI notifications. */
  setEventBus(bus: EventBus<MasteryEventMap>): void {
    this.eventBus = bus;
  }

  /**
   * Register all mastery definitions, creating ExperienceTables and
   * registering each mastery with the underlying ExperienceService.
   */
  loadDefinitions(definitions: readonly MasteryDefinitionLike[]): void {
    for (const def of definitions) {
      const masteryId = asMasteryId(def.id);
      const table = new ExperienceTable(def.experiencePerLevel);
      this.definitions.set(masteryId, def);
      this.tables.set(masteryId, table);
      this.experienceService.registerMastery(masteryId, table, def.maxLevel);
    }
  }

  /** Mark a mastery as discovered (first equipment acquisition). */
  discoverMastery(masteryId: MasteryId): MasteryResult<void> {
    if (!this.definitions.has(masteryId)) {
      return { ok: false, reason: "mastery_not_found" };
    }
    if (this.unlocked.has(masteryId)) {
      return { ok: false, reason: "mastery_already_unlocked" };
    }
    this.unlocked.add(masteryId);
    if (this.eventBus !== undefined) {
      this.eventBus.publish("MasteryDiscovered", { masteryId });
    }
    return { ok: true, value: undefined };
  }

  isMasteryUnlocked(masteryId: MasteryId): boolean {
    return this.unlocked.has(masteryId);
  }

  getMasteryState(masteryId: MasteryId): MasteryState | undefined {
    const progress = this.experienceService.getMasteryProgress(masteryId);
    if (progress === undefined) {
      return undefined;
    }
    return {
      masteryId,
      isUnlocked: this.unlocked.has(masteryId),
      level: progress.level,
      currentXp: progress.currentXp,
      totalLifetimeXp: progress.totalLifetimeXp,
    };
  }

  getAllMasteries(): ReadonlyMap<MasteryId, MasteryState> {
    const result = new Map<MasteryId, MasteryState>();
    for (const [id] of this.definitions) {
      const state = this.getMasteryState(id);
      if (state !== undefined) {
        result.set(id, state);
      }
    }
    return result;
  }

  getUnlockedMasteries(): readonly MasteryId[] {
    return [...this.unlocked];
  }

  /** Current global overflow XP pool. */
  getOverflowPool(): number {
    return this.overflowPool;
  }

  /** Add XP to the global overflow pool (called when a max-level mastery earns XP). */
  addOverflow(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      return;
    }
    const converted = Math.floor(amount * this.overflowConfig.conversionRate);
    this.overflowPool += converted;
  }

  /** Update overflow configuration. */
  setOverflowConfig(config: OverflowConfig): void {
    this.overflowConfig = config;
  }

  /** @internal Retrieve the ExperienceTable for a mastery (used by save provider). */
  _getTable(masteryId: MasteryId): ExperienceTable | undefined {
    return this.tables.get(masteryId);
  }

  /** @internal Get the unlocked set for persistence. */
  _getUnlockedSet(): ReadonlySet<MasteryId> {
    return this.unlocked;
  }

  /** @internal Get overflow state for persistence. */
  _getOverflowState(): { pool: number; config: OverflowConfig } {
    return { pool: this.overflowPool, config: this.overflowConfig };
  }

  /** @internal Restore unlocked set from save data. */
  _restoreUnlocked(ids: ReadonlySet<MasteryId>): void {
    this.unlocked.clear();
    for (const id of ids) {
      this.unlocked.add(id);
    }
  }

  /** @internal Restore overflow state from save data. */
  _restoreOverflow(pool: number, config: OverflowConfig): void {
    this.overflowPool = pool;
    this.overflowConfig = config;
  }
}
