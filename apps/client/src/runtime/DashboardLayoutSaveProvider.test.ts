import { describe, expect, it } from "vitest";
import { DashboardLayoutSaveProvider } from "./DashboardLayoutSaveProvider";

describe("DashboardLayoutSaveProvider", () => {
  it("round-trips a custom dashboard order", () => {
    const source = new DashboardLayoutSaveProvider();
    source.setOrder([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "tracked-resources",
    ]);

    const restored = new DashboardLayoutSaveProvider();
    restored.load(source.save());

    expect(restored.getOrder()).toEqual([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "tracked-resources",
    ]);
  });

  it("falls back safely when an old save has no dashboard layout payload", () => {
    const provider = new DashboardLayoutSaveProvider();
    provider.setOrder([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "tracked-resources",
    ]);

    provider.load(undefined);

    expect(provider.getOrder()).toEqual([
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "tracked-resources",
      "production",
    ]);
  });
});
