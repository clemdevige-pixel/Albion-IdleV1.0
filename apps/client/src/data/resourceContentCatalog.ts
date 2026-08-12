import { getProductionTierRules, type ProductionTier } from "./productionFamilyCatalog.js";
import {
  asGatheringToolId,
  asResourceDefinitionId,
  asResourceNodeDefinitionId,
  asResourceId,
  type GatheringToolDefinition,
  type GatheringToolRegistry,
  type ResourceDefinition,
  type ResourceFamily,
  type ResourceNodeDefinition,
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

export type CreatedResourceNode = ReturnType<ResourceNodeManager["createNode"]>;

export interface ResourceContentCatalogResult {
  readonly birchNode: CreatedResourceNode;
  readonly copperNode: CreatedResourceNode;
  readonly pineNode: CreatedResourceNode;
  readonly ironNode: CreatedResourceNode;
  readonly sturdyHideNode: CreatedResourceNode;
  readonly thickHideNode: CreatedResourceNode;
  readonly linenFiberNode: CreatedResourceNode;
  readonly fineFiberNode: CreatedResourceNode;

  readonly starterAxe: GatheringToolDefinition;
  readonly tier4Axe: GatheringToolDefinition;
  readonly starterPickaxe: GatheringToolDefinition;
  readonly tier4Pickaxe: GatheringToolDefinition;
  readonly starterSkinningKnife: GatheringToolDefinition;
  readonly tier4SkinningKnife: GatheringToolDefinition;
  readonly starterSickle: GatheringToolDefinition;
  readonly tier4Sickle: GatheringToolDefinition;
}

export const RESOURCE_DEFINITIONS = {
  birch: {
    id: asResourceDefinitionId("resource_birch_wood_t3"),
    name: "Bois de bouleau",
    family: "Wood",
    tier: 3,
    maxCharges: 999,
    respawnDurationTicks: 240,
    baseYield: 1,
    tags: ["wood", "birch", "starter"],
  },
  copper: {
    id: asResourceDefinitionId("resource_copper_ore_t3"),
    name: "Minerai de cuivre",
    family: "Ore",
    tier: 3,
    maxCharges: 999,
    respawnDurationTicks: 240,
    baseYield: 1,
    tags: ["ore", "copper", "starter"],
  },
  pine: {
    id: asResourceDefinitionId("resource_wood_t4"),
    name: "Bois de pin",
    family: "Wood",
    tier: 4,
    maxCharges: 999,
    respawnDurationTicks: 360,
    baseYield: 1,
    tags: ["wood", "pine", "tier4"],
  },
  iron: {
    id: asResourceDefinitionId("resource_ore_t4"),
    name: "Minerai de fer",
    family: "Ore",
    tier: 4,
    maxCharges: 999,
    respawnDurationTicks: 360,
    baseYield: 1,
    tags: ["ore", "iron", "tier4"],
  },
} as const satisfies Record<string, ResourceDefinition>;

export const RESOURCE_NODE_DEFINITIONS = {
  birch: {
    id: asResourceNodeDefinitionId("node_birch_tree_t3"),
    name: "Bouleau",
    resourceDefinitionId: asResourceDefinitionId("resource_birch_wood_t3"),
    requiredToolTier: 3,
    tags: ["forest", "starter"],
  },
  copper: {
    id: asResourceNodeDefinitionId("node_copper_vein_t3"),
    name: "Veine de cuivre",
    resourceDefinitionId: asResourceDefinitionId("resource_copper_ore_t3"),
    requiredToolTier: 3,
    tags: ["forest", "starter"],
  },
  pine: {
    id: asResourceNodeDefinitionId("node_pine_tree_t4"),
    name: "Pin ancien",
    resourceDefinitionId: asResourceDefinitionId("resource_wood_t4"),
    requiredToolTier: 4,
    tags: ["forest", "tier4"],
  },
  iron: {
    id: asResourceNodeDefinitionId("node_iron_vein_t4"),
    name: "Veine de fer",
    resourceDefinitionId: asResourceDefinitionId("resource_ore_t4"),
    requiredToolTier: 4,
    tags: ["mountain", "tier4"],
  },
} as const satisfies Record<string, ResourceNodeDefinition>;

export const GATHERING_TOOL_DEFINITIONS = {
  starterAxe: {
    id: asGatheringToolId("tool_axe_t3"),
    name: "Hache de compagnon",
    toolType: "axe" as const,
    tier: 3,
    speedModifier: 1,
    yieldModifier: 1,
    tags: ["starter"],
  },
  starterPickaxe: {
    id: asGatheringToolId("tool_pickaxe_t3"),
    name: "Pioche de compagnon",
    toolType: "pickaxe" as const,
    tier: 3,
    speedModifier: 1,
    yieldModifier: 1,
    tags: ["starter"],
  },
  tier4Axe: {
    id: asGatheringToolId("tool_axe_t4"),
    name: "Hache d'expert",
    toolType: "axe" as const,
    tier: 4,
    speedModifier: 0.85,
    yieldModifier: 1,
    tags: ["tier4"],
  },
  tier4Pickaxe: {
    id: asGatheringToolId("tool_pickaxe_t4"),
    name: "Pioche d'expert",
    toolType: "pickaxe" as const,
    tier: 4,
    speedModifier: 0.85,
    yieldModifier: 1,
    tags: ["tier4"],
  },
  starterSkinningKnife: {
    id: asGatheringToolId("tool_skinning_knife_t3"),
    name: "Couteau de dépeçage",
    toolType: "skinning_knife" as const,
    tier: 3,
    speedModifier: 1,
    yieldModifier: 1,
    tags: ["starter", "hide"],
  },
  tier4SkinningKnife: {
    id: asGatheringToolId("tool_skinning_knife_t4"),
    name: "Couteau de dépeçage d'expert",
    toolType: "skinning_knife" as const,
    tier: 4,
    speedModifier: 0.85,
    yieldModifier: 1,
    tags: ["tier4", "hide"],
  },
  starterSickle: {
    id: asGatheringToolId("tool_sickle_t3"),
    name: "Faucille de compagnon",
    toolType: "sickle" as const,
    tier: 3,
    speedModifier: 1,
    yieldModifier: 1,
    tags: ["starter", "fiber"],
  },
  tier4Sickle: {
    id: asGatheringToolId("tool_sickle_t4"),
    name: "Faucille d'expert",
    toolType: "sickle" as const,
    tier: 4,
    speedModifier: 0.85,
    yieldModifier: 1,
    tags: ["tier4", "fiber"],
  },
} as const satisfies Record<string, GatheringToolDefinition>;

export function setupResourceContentCatalog(
  deps: ResourceContentCatalogDependencies,
): ResourceContentCatalogResult {
  const {
    resourceRegistry,
    resourceRuntime,
    resourceNodeRegistry,
    resourceNodeManager,
    gatheringToolRegistry,
    forestZoneDefId,
  } = deps;

  const birchDefinitionId = RESOURCE_DEFINITIONS.birch.id;
  const birchResourceId = asResourceId("resource_birch_wood_runtime");
  const birchNodeDefinitionId = RESOURCE_NODE_DEFINITIONS.birch.id;

  resourceRegistry.register(RESOURCE_DEFINITIONS.birch);
  resourceRuntime.add({
    id: birchResourceId,
    definitionId: birchDefinitionId,
    state: "available",
    currentCharges: 999,
    maxCharges: 999,
    tier: 3,
    family: "Wood",
  });
  resourceNodeRegistry.register(RESOURCE_NODE_DEFINITIONS.birch);
  const birchNode = resourceNodeManager.createNode(
    birchNodeDefinitionId,
    forestZoneDefId,
    birchResourceId,
  );

  const starterAxe = GATHERING_TOOL_DEFINITIONS.starterAxe;
  gatheringToolRegistry.register(starterAxe);

  const copperDefinitionId = RESOURCE_DEFINITIONS.copper.id;
  const copperResourceId = asResourceId("resource_copper_ore_runtime");
  const copperNodeDefinitionId = RESOURCE_NODE_DEFINITIONS.copper.id;

  resourceRegistry.register(RESOURCE_DEFINITIONS.copper);
  resourceRuntime.add({
    id: copperResourceId,
    definitionId: copperDefinitionId,
    state: "available",
    currentCharges: 999,
    maxCharges: 999,
    tier: 3,
    family: "Ore",
  });
  resourceNodeRegistry.register(RESOURCE_NODE_DEFINITIONS.copper);
  const copperNode = resourceNodeManager.createNode(
    copperNodeDefinitionId,
    forestZoneDefId,
    copperResourceId,
  );

  const starterPickaxe = GATHERING_TOOL_DEFINITIONS.starterPickaxe;
  gatheringToolRegistry.register(starterPickaxe);

  const pineDefinitionId = RESOURCE_DEFINITIONS.pine.id;
  const pineResourceId = asResourceId("resource_pine_wood_runtime");
  const pineNodeDefinitionId = RESOURCE_NODE_DEFINITIONS.pine.id;

  resourceRegistry.register(RESOURCE_DEFINITIONS.pine);
  resourceRuntime.add({
    id: pineResourceId,
    definitionId: pineDefinitionId,
    state: "available",
    currentCharges: 999,
    maxCharges: 999,
    tier: 4,
    family: "Wood",
  });
  resourceNodeRegistry.register(RESOURCE_NODE_DEFINITIONS.pine);
  const pineNode = resourceNodeManager.createNode(
    pineNodeDefinitionId,
    forestZoneDefId,
    pineResourceId,
  );

  const ironDefinitionId = RESOURCE_DEFINITIONS.iron.id;
  const ironResourceId = asResourceId("resource_iron_ore_runtime");
  const ironNodeDefinitionId = RESOURCE_NODE_DEFINITIONS.iron.id;

  resourceRegistry.register(RESOURCE_DEFINITIONS.iron);
  resourceRuntime.add({
    id: ironResourceId,
    definitionId: ironDefinitionId,
    state: "available",
    currentCharges: 999,
    maxCharges: 999,
    tier: 4,
    family: "Ore",
  });
  resourceNodeRegistry.register(RESOURCE_NODE_DEFINITIONS.iron);
  const ironNode = resourceNodeManager.createNode(
    ironNodeDefinitionId,
    forestZoneDefId,
    ironResourceId,
  );

  const tier4Axe = GATHERING_TOOL_DEFINITIONS.tier4Axe;
  const tier4Pickaxe = GATHERING_TOOL_DEFINITIONS.tier4Pickaxe;
  const starterSkinningKnife = GATHERING_TOOL_DEFINITIONS.starterSkinningKnife;
  const tier4SkinningKnife = GATHERING_TOOL_DEFINITIONS.tier4SkinningKnife;
  const starterSickle = GATHERING_TOOL_DEFINITIONS.starterSickle;
  const tier4Sickle = GATHERING_TOOL_DEFINITIONS.tier4Sickle;

  gatheringToolRegistry.register(tier4Axe);
  gatheringToolRegistry.register(tier4Pickaxe);
  gatheringToolRegistry.register(starterSkinningKnife);
  gatheringToolRegistry.register(tier4SkinningKnife);
  gatheringToolRegistry.register(starterSickle);
  gatheringToolRegistry.register(tier4Sickle);

  const createProductionResource = (
    key: string,
    name: string,
    family: ResourceFamily,
    tier: ProductionTier,
  ) => {
    const definitionId = asResourceDefinitionId(`resource_${key}_t${String(tier)}`);
    const resourceId = asResourceId(`resource_${key}_t${String(tier)}_runtime`);
    const nodeDefinitionId = asResourceNodeDefinitionId(`node_${key}_t${String(tier)}`);
    resourceRegistry.register({
      id: definitionId,
      name,
      family,
      tier,
      maxCharges: 999,
      respawnDurationTicks: getProductionTierRules(tier).resourceRespawnDurationTicks,
      baseYield: 1,
      tags: [key, family.toLowerCase(), `tier${String(tier)}`],
    });
    resourceRuntime.add({
      id: resourceId,
      definitionId,
      state: "available",
      currentCharges: 999,
      maxCharges: 999,
      tier,
      family,
    });
    resourceNodeRegistry.register({
      id: nodeDefinitionId,
      name,
      resourceDefinitionId: definitionId,
      requiredToolTier: tier,
      tags: [family.toLowerCase(), `tier${String(tier)}`],
    });
    return resourceNodeManager.createNode(
      nodeDefinitionId,
      forestZoneDefId,
      resourceId,
    );
  };

  const sturdyHideNode = createProductionResource("hide", "Peau robuste", "Hide", 3);
  const thickHideNode = createProductionResource("hide", "Peau épaisse", "Hide", 4);
  const linenFiberNode = createProductionResource("fiber", "Fibre de lin", "Fiber", 3);
  const fineFiberNode = createProductionResource("fiber", "Fibre fine", "Fiber", 4);

  return {
    birchNode,
    copperNode,
    pineNode,
    ironNode,
    sturdyHideNode,
    thickHideNode,
    linenFiberNode,
    fineFiberNode,
    starterAxe,
    tier4Axe,
    starterPickaxe,
    tier4Pickaxe,
    starterSkinningKnife,
    tier4SkinningKnife,
    starterSickle,
    tier4Sickle,
  };
}
