import { describe, expect, it } from "vitest";
import { RESEARCH_DEFINITIONS } from "./researchContentCatalog.js";

describe("Academy Research gate", () => {
  it("requires an authored Academy tier on every Research definition", () => {
    for (const definition of RESEARCH_DEFINITIONS) {
      const academyRequirement = definition.requirements.find(
        (requirement) => requirement.type === "academy_tier",
      );
      expect(academyRequirement).toBeDefined();
      expect(academyRequirement?.minimumTier).toBe(definition.tier);
    }
  });
});
