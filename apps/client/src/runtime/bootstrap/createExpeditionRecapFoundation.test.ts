import { describe, expect, it, vi } from "vitest";
import { createExpeditionRecapFoundation } from "./createExpeditionRecapFoundation.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const SILVER_COMPLETION = {
  slotIndex: 0,
  expeditionId: "expedition_silver_t4",
  typeId: "silver",
  durationMs: TWO_HOURS_MS,
  rewardSummary: {
    kind: "silver" as const,
    silverCredited: 60_000,
    shardItemId: "item_resource_enchantment_shard_t4",
    shardsCredited: 92,
    quality: "reussie" as const,
  },
};

const FACTION_COMPLETION = {
  slotIndex: 1,
  expeditionId: "expedition_faction_t4",
  typeId: "faction",
  durationMs: TWO_HOURS_MS,
  rewardSummary: {
    kind: "faction_rune" as const,
    itemId: "item_resource_rune_faction_t4",
    runesCredited: 16,
    fragmentItemId: "item_resource_dungeon_key_fragment_t4",
    fragmentsCredited: 48,
    keyItemId: "item_resource_dungeon_key_t4",
    completeKeysCredited: 2,
    quality: "reussie" as const,
  },
};

describe("Expedition recap presentation", () => {
  it("groups multiple completions into one informational recap", () => {
    const foundation = createExpeditionRecapFoundation();
    const listener = vi.fn();
    foundation.subscribe(listener);

    foundation.present([SILVER_COMPLETION, FACTION_COMPLETION]);

    expect(foundation.getSnapshot()).toEqual({
      id: 1,
      items: [
        {
          expeditionId: "expedition_silver_t4",
          displayName: "Expédition généraliste T4",
          durationMs: TWO_HOURS_MS,
          reward: SILVER_COMPLETION.rewardSummary,
        },
        {
          expeditionId: "expedition_faction_t4",
          displayName: "Expédition de faction T4",
          durationMs: TWO_HOURS_MS,
          reward: FACTION_COMPLETION.rewardSummary,
        },
      ],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    foundation.dismiss();
    expect(foundation.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("preserves an existing recap when same-tick completions are presented separately", () => {
    const foundation = createExpeditionRecapFoundation();

    foundation.present([SILVER_COMPLETION]);
    foundation.present([FACTION_COMPLETION]);

    expect(foundation.getSnapshot()).toEqual({
      id: 1,
      items: [
        {
          expeditionId: "expedition_silver_t4",
          displayName: "Expédition généraliste T4",
          durationMs: TWO_HOURS_MS,
          reward: SILVER_COMPLETION.rewardSummary,
        },
        {
          expeditionId: "expedition_faction_t4",
          displayName: "Expédition de faction T4",
          durationMs: TWO_HOURS_MS,
          reward: FACTION_COMPLETION.rewardSummary,
        },
      ],
    });
  });
});
