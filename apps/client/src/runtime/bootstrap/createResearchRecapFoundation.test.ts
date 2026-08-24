import { describe, expect, it, vi } from "vitest";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";
import { createResearchRecapFoundation } from "./createResearchRecapFoundation.js";

describe("createResearchRecapFoundation", () => {
  it("derives recap content from authored Research presentation data", () => {
    const foundation = createResearchRecapFoundation();
    const listener = vi.fn();
    const unsubscribe = foundation.subscribe(listener);

    foundation.present(RESEARCH_IDS.dungeonSanctuaryLocation);

    expect(foundation.getSnapshot()).toMatchObject({
      researchId: RESEARCH_IDS.dungeonSanctuaryLocation,
      displayName: "Localisation des Sanctuaires",
      unlockedContent: [
        "World > Donjons",
        "Drops de fragments de clé",
        "Drops de clés complètes",
        "Drop rare de Runes de faction dans le monde",
      ],
    });
    expect(listener).toHaveBeenCalledTimes(1);

    foundation.dismiss();
    expect(foundation.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
