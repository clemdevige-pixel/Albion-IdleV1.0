import { describe, expect, it, vi } from "vitest";
import { createExpeditionRecapFoundation } from "./createExpeditionRecapFoundation.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

describe("Expedition recap presentation", () => {
  it("groups multiple completions into one informational recap", () => {
    const foundation = createExpeditionRecapFoundation();
    const listener = vi.fn();
    foundation.subscribe(listener);

    foundation.present([
      {
        slotIndex: 0,
        expeditionId: "expedition_silver_t4",
        typeId: "silver",
        durationMs: TWO_HOURS_MS,
        rewardSummary: { kind: "silver", silverCredited: 30_000 },
      },
      {
        slotIndex: 1,
        expeditionId: "expedition_keeper_t4",
        typeId: "keeper",
        durationMs: TWO_HOURS_MS,
        rewardSummary: {
          kind: "faction_rune",
          factionId: "keeper",
          itemId: "item_resource_rune_keeper_t4",
          baseRunes: 2,
          masteryBonusPercent: 25,
          finalRunes: 3,
        },
      },
    ]);

    expect(foundation.getSnapshot()).toEqual({
      id: 1,
      items: [
        {
          expeditionId: "expedition_silver_t4",
          displayName: "Expédition d'argent T4",
          durationMs: TWO_HOURS_MS,
          reward: { kind: "silver", silverCredited: 30_000 },
        },
        {
          expeditionId: "expedition_keeper_t4",
          displayName: "Expédition Keeper T4",
          durationMs: TWO_HOURS_MS,
          reward: {
            kind: "faction_rune",
            factionId: "keeper",
            itemId: "item_resource_rune_keeper_t4",
            baseRunes: 2,
            masteryBonusPercent: 25,
            finalRunes: 3,
          },
        },
      ],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    foundation.dismiss();
    expect(foundation.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
