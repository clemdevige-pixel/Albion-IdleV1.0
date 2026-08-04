import type { SaveProvider } from "@game/persistence";
import type { ExperienceSaveProvider } from "../experience/experience-save-provider.js";
import type { FameSaveProvider } from "../fame/fame-save-provider.js";
import type { DestinyBoardSaveProvider } from "../destiny-board/destiny-board-save-provider.js";
import type { MasterySaveProvider } from "../mastery/mastery-save-provider.js";

/**
 * Coordinates save/load across all progression-related save providers.
 *
 * Load order matters: experience first (raw XP), then mastery (unlocked set),
 * then fame (history/totals), then destiny board (unlocked nodes — depends on
 * experience levels being restored).
 */
export class ProgressionSaveCoordinator {
  private readonly providers: readonly SaveProvider[];

  constructor(
    private readonly experienceSaveProvider: ExperienceSaveProvider,
    private readonly fameSaveProvider: FameSaveProvider,
    private readonly destinyBoardSaveProvider: DestinyBoardSaveProvider,
    private readonly masterySaveProvider: MasterySaveProvider,
  ) {
    this.providers = [
      experienceSaveProvider,
      fameSaveProvider,
      destinyBoardSaveProvider,
      masterySaveProvider,
    ];
  }

  /** Returns all save providers (order not significant for external use). */
  getAllProviders(): readonly SaveProvider[] {
    return this.providers;
  }

  /** Save all progression state. */
  saveAll(): Map<string, unknown> {
    const data = new Map<string, unknown>();
    for (const provider of this.providers) {
      data.set(provider.providerId, provider.save());
    }
    return data;
  }

  /**
   * Load all progression state in the correct order:
   * experience → mastery → fame → destiny board.
   */
  loadAll(data: Map<string, unknown>): void {
    const loadOrder: SaveProvider[] = [
      this.experienceSaveProvider,
      this.masterySaveProvider,
      this.fameSaveProvider,
      this.destinyBoardSaveProvider,
    ];

    for (const provider of loadOrder) {
      const saved = data.get(provider.providerId);
      if (saved !== undefined) {
        provider.load(saved);
      }
    }
  }
}
