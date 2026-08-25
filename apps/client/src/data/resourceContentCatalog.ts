import {
  GATHERING_RESOURCE_TIER_CONTENT,
  type ProductionTier,
} from "@game/data";
import {
  GATHERING_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
  getProductionTierRules,
  type SupportedProductionFamily,
} from "./productionFamilyCatalog.js";
import {
  asGatheringToolId,
  asResourceDefinitionId,
  asResourceId,
  asResourceNodeDefinitionId,
  type GatheringToolDefinition,
  type GatheringToolRegistry,
  type ResourceNodeId,
  type ResourceNodeManager,
  type ResourceNodeRegistry,
  type ResourceRegistry,
  type ResourceRuntime,
  type ZoneDefinitionId,
} from "@game/gameplay";

export { GATHERING_RESOURCE_TIER_CONTENT as RESOURCE_TIER_CONTENT } from "@game/data";

export interface ResourceContentCatalogDependencies {
  readonly resourceRegistry: ResourceRegistry;
  readonly resourceRuntime: ResourceRuntime;
  readonly resourceNodeRegistry: ResourceNodeRegistry;
  readonly resourceNodeManager: ResourceNodeManager;
  readonly gatheringToolRegistry: GatheringToolRegistry;
  readonly forestZoneDefId: ZoneDefinitionId;
}

export interface GatheringTierRuntimeContent {
  readonly nodeId: ResourceNodeId;
  readonly tool: GatheringToolDefinition;
  readonly rawItemId: string;
}

export type ResourceContentCatalogResult = Readonly<Record<SupportedProductionFamily, Readonly<Partial<Record<ProductionTier, GatheringTierRuntimeContent>>>>>;

export function setupResourceContentCatalog(deps: ResourceContentCatalogDependencies): ResourceContentCatalogResult {
  const result = {} as Record<SupportedProductionFamily, Partial<Record<ProductionTier, GatheringTierRuntimeContent>>>;
  for (const familyId of PRODUCTION_FAMILY_IDS) {
    const familyDefinition = getProductionFamilyDefinition(familyId);
    const familyContent: Partial<Record<ProductionTier, GatheringTierRuntimeContent>> = {};
    for (const tier of GATHERING_CONTENT_TIERS) {
      const content = GATHERING_RESOURCE_TIER_CONTENT[familyId][tier];
      const tierRules = getProductionTierRules(tier);
      const resourceDefinitionId = asResourceDefinitionId(content.resourceDefinitionId);
      const runtimeResourceId = asResourceId(content.runtimeResourceId);
      const nodeDefinitionId = asResourceNodeDefinitionId(content.nodeDefinitionId);
      deps.resourceRegistry.register({ id: resourceDefinitionId, name: familyDefinition.tiers[tier]?.resourceName ?? content.nodeName, family: familyDefinition.gameplayFamily, tier, maxCharges: 999, respawnDurationTicks: tierRules.resourceRespawnDurationTicks, baseYield: 1, tags: [...content.tags] });
      deps.resourceRuntime.add({ id: runtimeResourceId, definitionId: resourceDefinitionId, state: "available", currentCharges: 999, maxCharges: 999, tier, family: familyDefinition.gameplayFamily });
      deps.resourceNodeRegistry.register({ id: nodeDefinitionId, name: content.nodeName, resourceDefinitionId, requiredToolTier: tier, tags: [...content.tags] });
      const tool: GatheringToolDefinition = { id: asGatheringToolId(content.toolId), name: content.toolName, toolType: content.toolType, tier, speedModifier: tierRules.gatheringToolSpeedModifier, yieldModifier: 1, tags: [...content.tags] };
      deps.gatheringToolRegistry.register(tool);
      const node = deps.resourceNodeManager.createNode(nodeDefinitionId, deps.forestZoneDefId, runtimeResourceId);
      familyContent[tier] = { nodeId: node.id, tool, rawItemId: content.rawItemId };
    }
    result[familyDefinition.gameplayFamily] = familyContent;
  }
  return result;
}
