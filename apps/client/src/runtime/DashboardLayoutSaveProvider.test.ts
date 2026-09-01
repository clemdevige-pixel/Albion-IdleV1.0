import { describe, expect, it } from "vitest";
import { DashboardLayoutSaveProvider } from "./DashboardLayoutSaveProvider";

describe("DashboardLayoutSaveProvider", () => {
  it("round-trips a custom dashboard order and ignored enchant items", () => {
    const source = new DashboardLayoutSaveProvider();
    source.setOrder([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
    ]);
    source.ignoreEnchantInstance("item_instance_42");

    const restored = new DashboardLayoutSaveProvider();
    restored.load(source.save());

    expect(restored.getOrder()).toEqual([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
    ]);
    expect([...restored.getIgnoredEnchantInstanceIds()]).toEqual(["item_instance_42"]);
  });

  it("loads version 1 dashboard saves without inventing ignored enchant items", () => {
    const provider = new DashboardLayoutSaveProvider();
    provider.ignoreEnchantInstance("item_instance_42");

    provider.load({
      version: 1,
      order: ["combat", "research", "yield", "enchant-ready", "production"],
    });

    expect(provider.getIgnoredEnchantInstanceIds().size).toBe(0);
  });

  it("falls back safely when an old save has no dashboard layout payload", () => {
    const provider = new DashboardLayoutSaveProvider();
    provider.setOrder([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
    ]);
    provider.ignoreEnchantInstance("item_instance_42");

    provider.load(undefined);

    expect(provider.getOrder()).toEqual([
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "production",
    ]);
    expect(provider.getIgnoredEnchantInstanceIds().size).toBe(0);
  });
});
