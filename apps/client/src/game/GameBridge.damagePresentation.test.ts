import { describe, expect, it } from "vitest";
import { GameBridge } from "./GameBridge";

describe("GameBridge damage presentation identity", () => {
  it("keeps the authoritative encounter key on enemy damage events", () => {
    const bridge = new GameBridge();

    bridge.addDamageNumber(
      42,
      "enemy",
      undefined,
      "auto_attack",
      58,
      "zone_amberwood_t5:3:2",
    );

    const event = bridge.damageNumbers.at(-1) as (typeof bridge.damageNumbers)[number] & {
      readonly encounterKey?: string;
      readonly targetHealthAfter?: number;
    };

    expect(event.encounterKey).toBe("zone_amberwood_t5:3:2");
    expect(event.targetHealthAfter).toBe(58);
  });
});
