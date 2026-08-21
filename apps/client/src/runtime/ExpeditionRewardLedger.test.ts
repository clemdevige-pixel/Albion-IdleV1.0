import { describe, expect, it } from "vitest";
import { ExpeditionRewardLedger } from "./ExpeditionRewardLedger.js";

describe("ExpeditionRewardLedger", () => {
  it("tracks only positive safe-integer Silver credits", () => {
    const ledger = new ExpeditionRewardLedger();
    ledger.recordSilverCredited(30_000);
    ledger.recordSilverCredited(90_000);
    expect(ledger.getLifetimeSilverCredited()).toBe(120_000);
    expect(() => ledger.recordSilverCredited(0)).toThrow();
    expect(() => ledger.recordSilverCredited(1.5)).toThrow();
  });

  it("persists the lifetime credited Silver total", () => {
    const source = new ExpeditionRewardLedger();
    source.recordSilverCredited(1_000_000);

    const restored = new ExpeditionRewardLedger();
    restored.load(source.save());

    expect(restored.getLifetimeSilverCredited()).toBe(1_000_000);
  });

  it("resets safely from malformed or absent payloads", () => {
    const ledger = new ExpeditionRewardLedger();
    ledger.recordSilverCredited(50_000);
    ledger.load(undefined);
    expect(ledger.getLifetimeSilverCredited()).toBe(0);
  });
});
