import {
  FactionKnowledgeService,
  RelicService,
  type RelicDefinition,
} from "@game/gameplay";
import { getMonsterDefinition } from "../../data/monsterContentCatalog.js";
import { RELIC_DEFINITIONS } from "../../data/relicContentCatalog.js";

export interface FactionResearchFoundationDependencies {
  readonly getCompletedSegmentCount: (zoneDefId: string) => number;
  readonly relicDefinitions?: readonly RelicDefinition[];
}

/**
 * Composition root for faction knowledge + Relics.
 *
 * The gameplay domains remain independent from client content catalogs. This
 * adapter resolves authored monster metadata into the generic ports consumed by
 * those domains.
 */
export function createFactionResearchFoundation(
  dependencies: FactionResearchFoundationDependencies,
) {
  let canExamineRelics = (): boolean => false;

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

  return {
    factionKnowledgeService,
    relicService,
    bindReconstructionGate(gate: () => boolean): void {
      canExamineRelics = gate;
    },
    recordMonsterKill(monsterId: string): readonly string[] {
      const result = factionKnowledgeService.recordKill(monsterId);
      if (!result.ok) return [];
      const acquired = relicService.recordMonsterKill(monsterId);
      const examined = relicService.resolveCompletedRelics();
      return [...acquired, ...examined];
    },
    resolveWorldProgress(): readonly string[] {
      return relicService.resolveCompletedRelics();
    },
  };
}

export type FactionResearchFoundation = ReturnType<typeof createFactionResearchFoundation>;
