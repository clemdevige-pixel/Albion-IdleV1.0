import { describe, expect, it } from "vitest";
import { createAcademyRuntimeFoundation } from "./createAcademyRuntimeFoundation.js";

describe("createAcademyRuntimeFoundation", () => {
  it("returns tier 0 while the Academy is not built", () => {
    const foundation = createAcademyRuntimeFoundation({
      islandService: {
        getBuildingLevel: () => undefined,
      },
    });

    expect(foundation.getResearchTier()).toBe(0);
  });

  it("maps Academy building level 1 to Research T4", () => {
    const foundation = createAcademyRuntimeFoundation({
      islandService: {
        getBuildingLevel: (definitionId) => definitionId === "academy" ? 1 : undefined,
      },
    });

    expect(foundation.getResearchTier()).toBe(4);
  });
});
