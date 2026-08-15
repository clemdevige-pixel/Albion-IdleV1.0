import { describe, expect, it } from "vitest";
import { isExcessiveAutoCastOverkill } from "./combatAutomationPolicy.js";

describe("combat automation overkill policy", () => {
  it("allows a lethal cast with only modest overkill", () => {
    expect(isExcessiveAutoCastOverkill(140, 100)).toBe(false);
  });

  it("holds a cast when immediate damage exceeds 150% of remaining HP", () => {
    expect(isExcessiveAutoCastOverkill(151, 100)).toBe(true);
  });

  it("keeps the exact 150% boundary allowed", () => {
    expect(isExcessiveAutoCastOverkill(150, 100)).toBe(false);
  });
});
