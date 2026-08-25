import { describe, expect, it, vi } from "vitest";
import { createFactionProgressionCoordinator } from "./createFactionProgressionCoordinator";

describe("createFactionProgressionCoordinator", () => {
  it("delivers expedition completion side effects after the active runtime tick stack", async () => {
    const onExpeditionCompletion = vi.fn();
    let expeditionCompletionListener: ((completed: readonly string[]) => void) | undefined;

    const coordinator = createFactionProgressionCoordinator({
      factionResearchFoundation: {
        recordMonsterKill: vi.fn(),
        resolveWorldProgress: vi.fn(),
      } as never,
      researchService: {
        advance: vi.fn(),
        onCompleted: vi.fn(() => () => {}),
      },
      expeditionService: {
        advance: vi.fn(() => {
          expeditionCompletionListener?.(["expedition_t4"]);
        }),
        onCompleted: vi.fn((listener: (completed: readonly string[]) => void) => {
          expeditionCompletionListener = listener;
          return () => {};
        }),
      },
      onExpeditionCompletion,
    });

    coordinator.advance(500);

    expect(onExpeditionCompletion).not.toHaveBeenCalled();

    await Promise.resolve();

    expect(onExpeditionCompletion).toHaveBeenCalledOnce();
    expect(onExpeditionCompletion).toHaveBeenCalledWith(["expedition_t4"]);
  });
});
