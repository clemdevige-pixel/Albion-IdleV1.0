export interface AuthoredDestinyRequirement {
  readonly type: "mastery_level";
  readonly masteryId: string;
  readonly level: number;
}

export interface AuthoredDestinyReward {
  readonly type: "equipment_tier_unlock";
  readonly tier: number;
}

export interface AuthoredDestinyNode {
  readonly id: string;
  readonly displayName: string;
  readonly category: "weapon";
  readonly prerequisites: readonly string[];
  readonly requirements: readonly AuthoredDestinyRequirement[];
  readonly rewards: readonly AuthoredDestinyReward[];
}

/** Current authored Destiny progression. Keep IDs stable for save compatibility. */
export const AUTHORED_DESTINY_NODES: readonly AuthoredDestinyNode[] = [
  {
    id: "node_sword_1",
    displayName: "Initié à l'épée",
    category: "weapon",
    prerequisites: [],
    requirements: [{ type: "mastery_level", masteryId: "mastery_sword", level: 1 }],
    rewards: [{ type: "equipment_tier_unlock", tier: 2 }],
  },
  {
    id: "node_sword_2",
    displayName: "Adepte de l'épée",
    category: "weapon",
    prerequisites: ["node_sword_1"],
    requirements: [{ type: "mastery_level", masteryId: "mastery_sword", level: 3 }],
    rewards: [{ type: "equipment_tier_unlock", tier: 3 }],
  },
] as const;
