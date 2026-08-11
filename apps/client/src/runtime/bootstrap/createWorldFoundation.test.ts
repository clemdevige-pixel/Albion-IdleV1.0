import { describe, expect, it } from "vitest";
import {
  buildWorldViewModel,
  createWorldFoundation,
} from "./createWorldFoundation";

describe("createWorldFoundation", () => {
  it("starts in the forest and builds the existing world view model", () => {
    const foundation = createWorldFoundation();
    const viewModel = buildWorldViewModel(foundation);

    expect(viewModel.zoneDefId).toBe(foundation.forestZoneDefId);
    expect(viewModel.zoneIndex).toBe(1);
    expect(viewModel.segmentIndex).toBe(1);
    expect(viewModel.zones).toHaveLength(foundation.zoneOrder.length);
  });
});
