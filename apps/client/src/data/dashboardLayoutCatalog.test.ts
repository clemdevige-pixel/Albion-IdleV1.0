import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  moveDashboardSection,
  normalizeDashboardSectionOrder,
} from "./dashboardLayoutCatalog";

describe("dashboard layout catalog", () => {
  it("keeps saved order and appends missing sections from defaults", () => {
    expect(normalizeDashboardSectionOrder(["yield", "combat"])).toEqual([
      "yield",
      "combat",
      "research",
      "enchant-ready",
      "production",
      "black-market-convoy",
    ]);
  });

  it("ignores unknown and duplicate section ids", () => {
    expect(normalizeDashboardSectionOrder(["combat", "unknown", "combat", "research"])).toEqual(
      DEFAULT_DASHBOARD_SECTION_ORDER,
    );
  });

  it("moves one section before the target", () => {
    expect(moveDashboardSection(DEFAULT_DASHBOARD_SECTION_ORDER, "production", "research")).toEqual([
      "combat",
      "production",
      "research",
      "yield",
      "enchant-ready",
      "black-market-convoy",
    ]);
  });
});
