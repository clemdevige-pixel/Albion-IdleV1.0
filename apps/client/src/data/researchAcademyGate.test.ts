import { describe, expect, it } from "vitest";
import {
  RESEARCH_DEFINITIONS,
  type ResearchContentRequirement,
} from "./researchContentCatalog.js";

type AcademyTierRequirement = Extract<
  ResearchContentRequirement,
  { readonly type: "academy_tier" }
>;

describe("Academy Research gate", () => {
  it("requires an authored Academy tier on every Research definition", () => {
    for (const definition of RESEARCH_DEFINITIONS) {
      const academyRequirement = definition.requirements.find(
        (requirement): requirement is AcademyTierRequirement => (
          requirement.type === "academy_tier"
        ),
      );
      expect(academyRequirement).toBeDefined();
      expect(academyRequirement?.minimumTier).toBe(definition.tier);
    }
  });
});
