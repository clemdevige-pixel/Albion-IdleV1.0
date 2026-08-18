import {
  GATHERING_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
  getProductionTierRules,
  type ProductionFamilyId,
  type ProductionTier,
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

export interface ResourceContentCatalogDependencies {
  readonly resourceRegistry: ResourceRegistry;
  readonly resourceRuntime: ResourceRuntime;
  readonly resourceNodeRegistry: ResourceNodeRegistry;
  readonly resourceNodeManager: ResourceNodeManager;
  readonly gatheringToolRegistry: GatheringToolRegistry;
  readonly forestZoneDefId: ZoneDefinitionId;
}

interface ResourceTierContent {
  readonly resourceDefinitionId: string;
  readonly runtimeResourceId: string;
  readonly rawItemId: string;
  readonly nodeDefinitionId: string;
  readonly nodeName: string;
  readonly toolId: string;
  readonly toolName: string;
  readonly toolType: "axe" | "pickaxe" | "skinning_knife" | "sickle";
  readonly tags: readonly string[];
}

/**
 * Authoritative gathering content. Gathering owns its raw output identity so it
 * can be authored independently from refining/crafting rollout.
 */
export const RESOURCE_TIER_CONTENT = {
  wood: {
    3: { resourceDefinitionId: "resource_birch_wood_t3", runtimeResourceId: "resource_birch_wood_runtime", rawItemId: "item_resource_wood_t3", nodeDefinitionId: "node_birch_tree_t3", nodeName: "Bouleau", toolId: "tool_axe_t3", toolName: "Hache de compagnon", toolType: "axe", tags: ["wood", "birch", "starter"] },
    4: { resourceDefinitionId: "resource_wood_t4", runtimeResourceId: "resource_pine_wood_runtime", rawItemId: "item_resource_wood_t4", nodeDefinitionId: "node_pine_tree_t4", nodeName: "Pin ancien", toolId: "tool_axe_t4", toolName: "Hache d'expert", toolType: "axe", tags: ["wood", "pine", "tier4"] },
    5: { resourceDefinitionId: "resource_wood_t5", runtimeResourceId: "resource_cedar_wood_runtime", rawItemId: "item_resource_wood_t5", nodeDefinitionId: "node_cedar_tree_t5", nodeName: "Cèdre ancien", toolId: "tool_axe_t5", toolName: "Hache de maître", toolType: "axe", tags: ["wood", "cedar", "tier5"] },
    6: { resourceDefinitionId: "resource_wood_t6", runtimeResourceId: "resource_bloodoak_wood_runtime", rawItemId: "item_resource_wood_t6", nodeDefinitionId: "node_bloodoak_tree_t6", nodeName: "Chêne sanglant", toolId: "tool_axe_t6", toolName: "Hache de grand maître", toolType: "axe", tags: ["wood", "bloodoak", "tier6"] },
    7: { resourceDefinitionId: "resource_wood_t7", runtimeResourceId: "resource_ashenwood_runtime", rawItemId: "item_resource_wood_t7", nodeDefinitionId: "node_ashen_tree_t7", nodeName: "Arbre cendré", toolId: "tool_axe_t7", toolName: "Hache ancienne", toolType: "axe", tags: ["wood", "ashen", "tier7"] },
  },
  ore: {
    3: { resourceDefinitionId: "resource_copper_ore_t3", runtimeResourceId: "resource_copper_ore_runtime", rawItemId: "item_resource_copper_ore_t3", nodeDefinitionId: "node_copper_vein_t3", nodeName: "Veine de cuivre", toolId: "tool_pickaxe_t3", toolName: "Pioche de compagnon", toolType: "pickaxe", tags: ["ore", "copper", "starter"] },
    4: { resourceDefinitionId: "resource_ore_t4", runtimeResourceId: "resource_iron_ore_runtime", rawItemId: "item_resource_ore_t4", nodeDefinitionId: "node_iron_vein_t4", nodeName: "Veine de fer", toolId: "tool_pickaxe_t4", toolName: "Pioche d'expert", toolType: "pickaxe", tags: ["ore", "iron", "tier4"] },
    5: { resourceDefinitionId: "resource_ore_t5", runtimeResourceId: "resource_titanium_ore_runtime", rawItemId: "item_resource_ore_t5", nodeDefinitionId: "node_titanium_vein_t5", nodeName: "Veine de titane", toolId: "tool_pickaxe_t5", toolName: "Pioche de maître", toolType: "pickaxe", tags: ["ore", "titanium", "tier5"] },
    6: { resourceDefinitionId: "resource_ore_t6", runtimeResourceId: "resource_runite_ore_runtime", rawItemId: "item_resource_ore_t6", nodeDefinitionId: "node_runite_vein_t6", nodeName: "Veine de runite", toolId: "tool_pickaxe_t6", toolName: "Pioche de grand maître", toolType: "pickaxe", tags: ["ore", "runite", "tier6"] },
    7: { resourceDefinitionId: "resource_ore_t7", runtimeResourceId: "resource_meteorite_ore_runtime", rawItemId: "item_resource_ore_t7", nodeDefinitionId: "node_meteorite_vein_t7", nodeName: "Veine de météorite", toolId: "tool_pickaxe_t7", toolName: "Pioche ancienne", toolType: "pickaxe", tags: ["ore", "meteorite", "tier7"] },
  },
  hide: {
    3: { resourceDefinitionId: "resource_hide_t3", runtimeResourceId: "resource_hide_t3_runtime", rawItemId: "item_resource_hide_t3", nodeDefinitionId: "node_hide_t3", nodeName: "Peau robuste", toolId: "tool_skinning_knife_t3", toolName: "Couteau de dépeçage", toolType: "skinning_knife", tags: ["hide", "sturdy", "starter"] },
    4: { resourceDefinitionId: "resource_hide_t4", runtimeResourceId: "resource_hide_t4_runtime", rawItemId: "item_resource_hide_t4", nodeDefinitionId: "node_hide_t4", nodeName: "Peau épaisse", toolId: "tool_skinning_knife_t4", toolName: "Couteau de dépeçage d'expert", toolType: "skinning_knife", tags: ["hide", "thick", "tier4"] },
    5: { resourceDefinitionId: "resource_hide_t5", runtimeResourceId: "resource_hide_t5_runtime", rawItemId: "item_resource_hide_t5", nodeDefinitionId: "node_hide_t5", nodeName: "Peau lourde", toolId: "tool_skinning_knife_t5", toolName: "Couteau de dépeçage de maître", toolType: "skinning_knife", tags: ["hide", "heavy", "tier5"] },
    6: { resourceDefinitionId: "resource_hide_t6", runtimeResourceId: "resource_hide_t6_runtime", rawItemId: "item_resource_hide_t6", nodeDefinitionId: "node_hide_t6", nodeName: "Peau renforcée", toolId: "tool_skinning_knife_t6", toolName: "Couteau de dépeçage de grand maître", toolType: "skinning_knife", tags: ["hide", "reinforced", "tier6"] },
    7: { resourceDefinitionId: "resource_hide_t7", runtimeResourceId: "resource_hide_t7_runtime", rawItemId: "item_resource_hide_t7", nodeDefinitionId: "node_hide_t7", nodeName: "Peau durcie", toolId: "tool_skinning_knife_t7", toolName: "Couteau de dépeçage ancien", toolType: "skinning_knife", tags: ["hide", "hardened", "tier7"] },
  },
  fiber: {
    3: { resourceDefinitionId: "resource_fiber_t3", runtimeResourceId: "resource_fiber_t3_runtime", rawItemId: "item_resource_fiber_t3", nodeDefinitionId: "node_fiber_t3", nodeName: "Fibre de lin", toolId: "tool_sickle_t3", toolName: "Faucille de compagnon", toolType: "sickle", tags: ["fiber", "linen", "starter"] },
    4: { resourceDefinitionId: "resource_fiber_t4", runtimeResourceId: "resource_fiber_t4_runtime", rawItemId: "item_resource_fiber_t4", nodeDefinitionId: "node_fiber_t4", nodeName: "Fibre fine", toolId: "tool_sickle_t4", toolName: "Faucille d'expert", toolType: "sickle", tags: ["fiber", "fine", "tier4"] },
    5: { resourceDefinitionId: "resource_fiber_t5", runtimeResourceId: "resource_fiber_t5_runtime", rawItemId: "item_resource_fiber_t5", nodeDefinitionId: "node_fiber_t5", nodeName: "Fibre céleste", toolId: "tool_sickle_t5", toolName: "Faucille de maître", toolType: "sickle", tags: ["fiber", "skyflower", "tier5"] },
    6: { resourceDefinitionId: "resource_fiber_t6", runtimeResourceId: "resource_fiber_t6_runtime", rawItemId: "item_resource_fiber_t6", nodeDefinitionId: "node_fiber_t6", nodeName: "Fibre écarlate", toolId: "tool_sickle_t6", toolName: "Faucille de grand maître", toolType: "sickle", tags: ["fiber", "scarlet", "tier6"] },
    7: { resourceDefinitionId: "resource_fiber_t7", runtimeResourceId: "resource_fiber_t7_runtime", rawItemId: "item_resource_fiber_t7", nodeDefinitionId: "node_fiber_t7", nodeName: "Fibre solaire", toolId: "tool_sickle_t7", toolName: "Faucille ancienne", toolType: "sickle", tags: ["fiber", "solar", "tier7"] },
  },
} as const satisfies Record<ProductionFamilyId, Partial<Record<ProductionTier, ResourceTierContent>>>;

export interface GatheringTierRuntimeContent {
  readonly nodeId: ResourceNodeId;
  readonly tool: GatheringToolDefinition;
  readonly rawItemId: string;
}

export type ResourceContentCatalogResult = Readonly<
  Record<
    SupportedProductionFamily,
    Readonly<Partial<Record<ProductionTier, GatheringTierRuntimeContent>>>
  >
>;

export function setupResourceContentCatalog(
  deps: ResourceContentCatalogDependencies,
): ResourceContentCatalogResult {
  const result = {} as Record<
    SupportedProductionFamily,
    Partial<Record<ProductionTier, GatheringTierRuntimeContent>>
  >;

  for (const familyId of PRODUCTION_FAMILY_IDS) {
    const familyDefinition = getProductionFamilyDefinition(familyId);
    const familyContent: Partial<Record<ProductionTier, GatheringTierRuntimeContent>> = {};

    for (const tier of GATHERING_CONTENT_TIERS) {
      const content = RESOURCE_TIER_CONTENT[familyId][tier];
      const tierRules = getProductionTierRules(tier);
      const resourceDefinitionId = asResourceDefinitionId(content.resourceDefinitionId);
      const runtimeResourceId = asResourceId(content.runtimeResourceId);
      const nodeDefinitionId = asResourceNodeDefinitionId(content.nodeDefinitionId);

      deps.resourceRegistry.register({
        id: resourceDefinitionId,
        name: familyDefinition.tiers[tier]?.resourceName ?? content.nodeName,
        family: familyDefinition.gameplayFamily,
        tier,
        maxCharges: 999,
        respawnDurationTicks: tierRules.resourceRespawnDurationTicks,
        baseYield: 1,
        tags: [...content.tags],
      });
      deps.resourceRuntime.add({
        id: runtimeResourceId,
        definitionId: resourceDefinitionId,
        state: "available",
        currentCharges: 999,
        maxCharges: 999,
        tier,
        family: familyDefinition.gameplayFamily,
      });
      deps.resourceNodeRegistry.register({
        id: nodeDefinitionId,
        name: content.nodeName,
        resourceDefinitionId,
        requiredToolTier: tier,
        tags: [...content.tags],
      });

      const tool: GatheringToolDefinition = {
        id: asGatheringToolId(content.toolId),
        name: content.toolName,
        toolType: content.toolType,
        tier,
        speedModifier: tierRules.gatheringToolSpeedModifier,
        yieldModifier: 1,
        tags: [...content.tags],
      };
      deps.gatheringToolRegistry.register(tool);
      const node = deps.resourceNodeManager.createNode(
        nodeDefinitionId,
        deps.forestZoneDefId,
        runtimeResourceId,
      );
      familyContent[tier] = { nodeId: node.id, tool, rawItemId: content.rawItemId };
    }

    result[familyDefinition.gameplayFamily] = familyContent;
  }

  return result;
}
