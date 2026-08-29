import { describe, expect, it, vi } from "vitest";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";
import { createResearchRecapFoundation } from "./createResearchRecapFoundation.js";

describe("createResearchRecapFoundation", () => {
  it("derives recap content and destinations from canonical Research unlocks", () => {
    const foundation = createResearchRecapFoundation();
    const listener = vi.fn();
    const unsubscribe = foundation.subscribe(listener);

    foundation.present(RESEARCH_IDS.dungeonRelicAnalysis);

    expect(foundation.getSnapshot()).toMatchObject({
      researchId: RESEARCH_IDS.dungeonRelicAnalysis,
      displayName: "Analyse de la Relique",
      unlockedContent: [
        "Donjons",
        "Drops de fragments et clés de donjon",
        "Drop rare de Runes de faction",
      ],
      unlockGuidance: [
        { label: "Donjons", destination: "Monde > Donjons" },
        {
          label: "Drops de fragments et clés de donjon",
          destination: "Combat contre les monstres éligibles",
        },
        {
          label: "Drop rare de Runes de faction",
          destination: "Monstres de faction dans le monde",
        },
      ],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    foundation.dismiss();
    expect(foundation.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("queues multiple Research completions FIFO without losing a recap", () => {
    const foundation = createResearchRecapFoundation();

    foundation.present(RESEARCH_IDS.enchantmentStudy);
    const first = foundation.getSnapshot();
    foundation.present(RESEARCH_IDS.yieldAnalysis);

    expect(foundation.getSnapshot()).toMatchObject({
      id: first?.id,
      researchId: RESEARCH_IDS.enchantmentStudy,
    });

    foundation.dismiss();
    expect(foundation.getSnapshot()).toMatchObject({
      researchId: RESEARCH_IDS.yieldAnalysis,
    });

    foundation.dismiss();
    expect(foundation.getSnapshot()).toBeNull();
  });
});
