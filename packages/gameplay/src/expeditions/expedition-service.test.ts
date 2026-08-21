import { describe, expect, it, vi } from "vitest";
import { ExpeditionService } from "./expedition-service.js";
import {
  EXPEDITION_DURATION_OPTIONS_MS,
  type ExpeditionDefinition,
  type ExpeditionRequirementDefinition,
} from "./types.js";

const [DURATION_2H, DURATION_6H, DURATION_12H] = EXPEDITION_DURATION_OPTIONS_MS;

type TestRequirement = ExpeditionRequirementDefinition & {
  readonly type: "flag";
  readonly flagId: string;
};

interface TestRewardSummary {
  readonly expeditionId: string;
  readonly durationMs: number;
}

function createDefinition(
  overrides: Partial<ExpeditionDefinition<TestRequirement>> = {},
): ExpeditionDefinition<TestRequirement> {
  return {
    id: "expedition_silver_t4",
    typeId: "silver",
    displayName: "Silver Expedition T4",
    tier: 4,
    requirements: [],
    ...overrides,
  };
}

function createService(options?: {
  readonly capacity?: number;
  readonly metFlags?: ReadonlySet<string>;
}) {
  const reward = vi.fn((definition: ExpeditionDefinition<TestRequirement>, durationMs: number) => ({
    expeditionId: definition.id,
    durationMs,
  }));
  const service = new ExpeditionService<TestRequirement, TestRewardSummary>({
    requirementPort: {
      isRequirementMet(requirement) {
        return options?.metFlags?.has(requirement.flagId) ?? false;
      },
    },
    slotCapacityPort: {
      getSlotCapacity: () => options?.capacity ?? 1,
    },
    rewardPort: {
      grantCompletionReward: reward,
    },
  });
  return { service, reward };
}

describe("ExpeditionService", () => {
  it("accepts only authored T4-T8 definitions and rejects duplicates", () => {
    const { service } = createService();
    expect(service.registerExpedition(createDefinition())).toEqual({ ok: true });
    expect(service.registerExpedition(createDefinition())).toEqual({
      ok: false,
      reason: "duplicate_expedition",
    });
    expect(service.registerExpedition(createDefinition({ tier: 3, id: "invalid" }))).toEqual({
      ok: false,
      reason: "invalid_definition",
    });
  });

  it("uses the validated 2h, 6h and 12h duration formats", () => {
    const { service } = createService();
    service.registerExpedition(createDefinition());

    expect(service.startExpedition("expedition_silver_t4", DURATION_2H).ok).toBe(true);

    const second = createService().service;
    second.registerExpedition(createDefinition());
    expect(second.startExpedition("expedition_silver_t4", DURATION_6H).ok).toBe(true);

    const third = createService().service;
    third.registerExpedition(createDefinition());
    expect(third.startExpedition("expedition_silver_t4", DURATION_12H).ok).toBe(true);
  });

  it("blocks an expedition until its authored requirements are satisfied", () => {
    const { service } = createService();
    service.registerExpedition(createDefinition({
      requirements: [{ type: "flag", flagId: "cartography_1" }],
    }));
    expect(service.startExpedition("expedition_silver_t4", DURATION_2H)).toEqual({
      ok: false,
      reason: "requirements_not_met",
    });
  });

  it("enforces slot capacity independently from expedition definitions", () => {
    const { service } = createService({ capacity: 1 });
    service.registerExpedition(createDefinition());
    service.registerExpedition(createDefinition({
      id: "expedition_keeper_t4",
      typeId: "keeper",
      displayName: "Keeper Expedition T4",
    }));

    expect(service.startExpedition("expedition_silver_t4", DURATION_2H).ok).toBe(true);
    expect(service.startExpedition("expedition_keeper_t4", DURATION_2H)).toEqual({
      ok: false,
      reason: "no_available_slot",
    });
  });

  it("allows different types in two slots but never the same type twice", () => {
    const { service } = createService({ capacity: 2 });
    service.registerExpedition(createDefinition());
    service.registerExpedition(createDefinition({
      id: "expedition_silver_t5",
      displayName: "Silver Expedition T5",
      tier: 5,
    }));
    service.registerExpedition(createDefinition({
      id: "expedition_keeper_t4",
      typeId: "keeper",
      displayName: "Keeper Expedition T4",
    }));

    expect(service.startExpedition("expedition_silver_t4", DURATION_2H).ok).toBe(true);
    expect(service.startExpedition("expedition_silver_t5", DURATION_2H)).toEqual({
      ok: false,
      reason: "type_already_active",
    });
    expect(service.startExpedition("expedition_keeper_t4", DURATION_2H).ok).toBe(true);
  });

  it("advances all active slots from the same authoritative elapsed time", () => {
    const { service, reward } = createService({ capacity: 2 });
    service.registerExpedition(createDefinition());
    service.registerExpedition(createDefinition({
      id: "expedition_keeper_t4",
      typeId: "keeper",
      displayName: "Keeper Expedition T4",
    }));
    service.startExpedition("expedition_silver_t4", DURATION_2H);
    service.startExpedition("expedition_keeper_t4", DURATION_6H);

    const firstAdvance = service.advance(DURATION_2H);
    expect(firstAdvance.completed).toHaveLength(1);
    expect(firstAdvance.completed[0]?.expeditionId).toBe("expedition_silver_t4");
    expect(firstAdvance.activeExpeditions).toEqual([{
      slotIndex: 1,
      expeditionId: "expedition_keeper_t4",
      typeId: "keeper",
      durationMs: DURATION_6H,
      remainingDurationMs: DURATION_6H - DURATION_2H,
    }]);
    expect(reward).toHaveBeenCalledTimes(1);

    const secondAdvance = service.advance(DURATION_6H - DURATION_2H);
    expect(secondAdvance.completed[0]?.expeditionId).toBe("expedition_keeper_t4");
    expect(secondAdvance.activeExpeditions).toEqual([]);
    expect(reward).toHaveBeenCalledTimes(2);
  });

  it("credits completion automatically and frees the completed slot", () => {
    const { service, reward } = createService();
    service.registerExpedition(createDefinition());
    service.startExpedition("expedition_silver_t4", DURATION_2H);

    const result = service.advance(DURATION_2H);
    expect(reward).toHaveBeenCalledOnce();
    expect(result.completed[0]?.rewardSummary).toEqual({
      expeditionId: "expedition_silver_t4",
      durationMs: DURATION_2H,
    });
    expect(service.getActiveExpeditions()).toEqual([]);
  });

  it("persists partial progress without granting or rerolling rewards on load", () => {
    const first = createService();
    first.service.registerExpedition(createDefinition());
    first.service.startExpedition("expedition_silver_t4", DURATION_6H);
    first.service.advance(DURATION_2H);
    const snapshot = first.service.save();

    const restored = createService();
    restored.service.registerExpedition(createDefinition());
    restored.service.load(snapshot);

    expect(restored.reward).not.toHaveBeenCalled();
    expect(restored.service.getActiveExpeditions()[0]?.remainingDurationMs).toBe(
      DURATION_6H - DURATION_2H,
    );
    restored.service.advance(DURATION_6H - DURATION_2H);
    expect(restored.reward).toHaveBeenCalledOnce();
  });

  it("rejects invalid elapsed time instead of consulting a local clock", () => {
    const { service } = createService();
    service.registerExpedition(createDefinition());
    service.startExpedition("expedition_silver_t4", DURATION_2H);
    expect(() => service.advance(-1)).toThrow(
      "Expedition elapsed time must be a finite non-negative number",
    );
  });
});
