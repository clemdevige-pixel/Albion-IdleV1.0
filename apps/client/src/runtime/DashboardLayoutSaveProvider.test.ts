import { describe, expect, it } from "vitest";
import { DashboardLayoutSaveProvider } from "./DashboardLayoutSaveProvider";

describe("DashboardLayoutSaveProvider", () => {
  it("round-trips a custom dashboard order, ignored enchant items and acknowledged feature unlocks", () => {
    const source = new DashboardLayoutSaveProvider();
    source.setOrder([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "black-market-convoy",
    ]);
    source.ignoreEnchantInstance("item_instance_42");
    source.acknowledgeFeatureUnlock("dungeon:system");

    const restored = new DashboardLayoutSaveProvider();
    restored.load(source.save());

    expect(restored.getOrder()).toEqual([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "black-market-convoy",
    ]);
    expect([...restored.getIgnoredEnchantInstanceIds()]).toEqual(["item_instance_42"]);
    expect([...restored.getAcknowledgedFeatureUnlockIds()]).toEqual(["dungeon:system"]);
  });

  it("loads version 1 dashboard saves without inventing ignored enchant items or feature acknowledgements", () => {
    const provider = new DashboardLayoutSaveProvider();
    provider.ignoreEnchantInstance("item_instance_42");
    provider.acknowledgeFeatureUnlock("dungeon:system");

    provider.load({
      version: 1,
      order: ["combat", "research", "yield", "enchant-ready", "production"],
    });

    expect(provider.getOrder()).toEqual([
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "production",
      "black-market-convoy",
    ]);
    expect(provider.getIgnoredEnchantInstanceIds().size).toBe(0);
    expect(provider.getAcknowledgedFeatureUnlockIds().size).toBe(0);
  });

  it("loads version 2 dashboard saves without inventing feature acknowledgements", () => {
    const provider = new DashboardLayoutSaveProvider();
    provider.acknowledgeFeatureUnlock("tower:system");

    provider.load({
      version: 2,
      order: ["combat", "research", "yield", "enchant-ready", "production"],
      ignoredEnchantInstanceIds: ["item_instance_42"],
    });

    expect(provider.getOrder()).toEqual([
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "production",
      "black-market-convoy",
    ]);
    expect([...provider.getIgnoredEnchantInstanceIds()]).toEqual(["item_instance_42"]);
    expect(provider.getAcknowledgedFeatureUnlockIds().size).toBe(0);
  });

  it("falls back safely when an old save has no dashboard layout payload", () => {
    const provider = new DashboardLayoutSaveProvider();
    provider.setOrder([
      "production",
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "black-market-convoy",
    ]);
    provider.ignoreEnchantInstance("item_instance_42");
    provider.acknowledgeFeatureUnlock("dungeon:system");

    provider.load(undefined);

    expect(provider.getOrder()).toEqual([
      "combat",
      "research",
      "yield",
      "enchant-ready",
      "production",
      "black-market-convoy",
    ]);
    expect(provider.getIgnoredEnchantInstanceIds().size).toBe(0);
    expect(provider.getAcknowledgedFeatureUnlockIds().size).toBe(0);
  });
});
