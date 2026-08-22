import {
  getResearchPresentationInfo,
  RESEARCH_DEFINITIONS,
} from "../../data/researchContentCatalog.js";

export interface ResearchRecapModel {
  readonly id: number;
  readonly researchId: string;
  readonly displayName: string;
  readonly effectSummary: string;
  readonly unlockedContent: readonly string[];
}

type Listener = () => void;

/** Presentation-only store. Research unlocks are already committed before this runs. */
export function createResearchRecapFoundation() {
  let recap: ResearchRecapModel | null = null;
  let nextId = 1;
  const listeners = new Set<Listener>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe(this: void, listener: Listener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    getSnapshot(this: void): ResearchRecapModel | null {
      return recap;
    },

    present(this: void, researchId: string): void {
      const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === researchId);
      if (definition === undefined) {
        throw new Error(`Unknown Research recap definition: ${researchId}`);
      }
      const presentation = getResearchPresentationInfo(researchId);
      recap = {
        id: nextId,
        researchId,
        displayName: definition.displayName,
        effectSummary: presentation?.effectSummary ?? "Recherche terminée.",
        unlockedContent: presentation?.unlockedContent ?? [],
      };
      nextId += 1;
      notify();
    },

    dismiss(this: void): void {
      if (recap === null) return;
      recap = null;
      notify();
    },
  };
}

export type ResearchRecapFoundation = ReturnType<typeof createResearchRecapFoundation>;
