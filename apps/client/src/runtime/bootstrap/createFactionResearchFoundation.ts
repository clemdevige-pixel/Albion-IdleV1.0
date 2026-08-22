import {
  FactionKnowledgeService,
  RelicService,
  type RelicDefinition,
} from "@game/gameplay";
import { getMonsterDefinition } from "../../data/monsterContentCatalog.js";
import { RELIC_DEFINITIONS } from "../../data/relicContentCatalog.js";

export interface FactionResearchFoundationDependencies {
  readonly relicDefinitions?: readonly RelicDefinition[];
}

interface RelicInventoryPort {
  hasItem(definition: RelicDefinition): boolean;
  grantItem(definition: RelicDefinition): boolean;
}

const DEFAULT_RELIC_INVENTORY_PORT: RelicInventoryPort = {
  hasItem: () => true,
  grantItem: () => true,
};

/**
 * Composition root for faction knowledge + Relics.
 * Gameplay domains remain independent from client content and inventory owners.
 */
export function createFactionResearchFoundation(
  dependencies: FactionResearchFoundationDependencies = {},
) {
  let canExamineRelics = (): boolean => false;
  let relicInventoryPort: RelicInventoryPort = DEFAULT_RELIC_INVENTORY_PORT;

  const factionKnowledgeService = new FactionKnowledgeService({
    resolveMonster(monsterId) {
      const monster = getMonsterDefinition(monsterId);
      if (monster === undefined) return undefined;
      return {
        monsterId,
        factionId: monster.faction.toLowerCase(),
        isElite: monster.category === "elite",
      };
    },
  });

  const relicService = new RelicService(
    {
      getFactionKillCount: (factionId) => factionKnowledgeService.getFactionKillCount(factionId),
    },
    {
      canReconstructRelic: () => canExamineRelics(),
    },
  );

  for (const definition of dependencies.relicDefinitions ?? RELIC_DEFINITIONS) {
    const result = relicService.registerRelic(definition);
    if (!result.ok) {
      throw new Error(`Invalid authored Relic definition: ${definition.id} (${result.reason})`);
    }
  }

  const ensureInventoryMirror = (): void => {
    for (const definition of relicService.getDefinitions()) {
      const state = relicService.getProgress(definition.id)?.state;
      if (state === undefined || state === "unobtained") continue;
      if (!relicInventoryPort.hasItem(definition)) relicInventoryPort.grantItem(definition);
    }
  };

  return {
    factionKnowledgeService,
    relicService,
    bindReconstructionGate(gate: () => boolean): void {
      canExamineRelics = gate;
    },
    bindRelicInventory(port: RelicInventoryPort): void {
      relicInventoryPort = port;
      ensureInventoryMirror();
    },
    recordMonsterKill(monsterId: string): readonly string[] {
      const result = factionKnowledgeService.recordKill(monsterId);
      if (!result.ok) return [];
      const acquired = relicService.recordMonsterKill(
        monsterId,
        (definition) => relicInventoryPort.hasItem(definition) || relicInventoryPort.grantItem(definition),
      );
      const examined = relicService.resolveCompletedRelics();
      return [...acquired, ...examined];
    },
    resolveWorldProgress(): readonly string[] {
      ensureInventoryMirror();
      return relicService.resolveCompletedRelics();
    },
  };
}

export type FactionResearchFoundation = ReturnType<typeof createFactionResearchFoundation>;
