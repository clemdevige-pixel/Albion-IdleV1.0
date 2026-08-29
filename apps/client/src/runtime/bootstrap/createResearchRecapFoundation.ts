import {
  getResearchPresentationInfo,
  getResearchUnlockGuidance,
  getResearchUnlockedContent,
  RESEARCH_DEFINITIONS,
  type ResearchUnlockPresentation,
} from "../../data/researchContentCatalog.js";
import { isDevSandboxMode } from "../devSandbox.js";

export interface ResearchRecapModel {
  readonly id: number;
  readonly researchId: string;
  readonly displayName: string;
  readonly effectSummary: string;
  readonly unlockedContent: readonly string[];
  readonly unlockGuidance: readonly ResearchUnlockPresentation[];
}

type Listener = () => void;

/** Presentation-only FIFO store. Research unlocks are already committed before this runs. */
export function createResearchRecapFoundation() {
  const queue: ResearchRecapModel[] = [];
  let nextId = 1;
  const listeners = new Set<Listener>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const present = (researchId: string): void => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === researchId);
    if (definition === undefined) {
      throw new Error(`Unknown Research recap definition: ${researchId}`);
    }
    const presentation = getResearchPresentationInfo(researchId);
    queue.push({
      id: nextId,
      researchId,
      displayName: definition.displayName,
      effectSummary: presentation?.effectSummary ?? "Recherche terminée.",
      unlockedContent: getResearchUnlockedContent(researchId),
      unlockGuidance: getResearchUnlockGuidance(researchId),
    });
    nextId += 1;
    notify();
  };

  if (isDevSandboxMode()) {
    for (const definition of RESEARCH_DEFINITIONS) {
      present(definition.id);
    }
  }

  return {
    subscribe(this: void, listener: Listener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    getSnapshot(this: void): ResearchRecapModel | null {
      return queue[0] ?? null;
    },

    present(this: void, researchId: string): void {
      present(researchId);
    },

    dismiss(this: void): void {
      if (queue.length === 0) return;
      queue.shift();
      notify();
    },
  };
}

export type ResearchRecapFoundation = ReturnType<typeof createResearchRecapFoundation>;
