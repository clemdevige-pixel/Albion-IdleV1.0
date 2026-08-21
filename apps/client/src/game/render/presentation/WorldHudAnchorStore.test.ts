import { afterEach, describe, expect, it, vi } from "vitest";
import { worldHudAnchorStore } from "./WorldHudAnchorStore";

describe("WorldHudAnchorStore", () => {
  afterEach(() => {
    worldHudAnchorStore.reset();
  });

  it("publishes actor anchor movement and visibility from one source", () => {
    const listener = vi.fn();
    const unsubscribe = worldHudAnchorStore.subscribe(listener);

    worldHudAnchorStore.setAnchor("enemy", { x: 420, y: 180, visible: true });
    expect(worldHudAnchorStore.getSnapshot().enemy).toEqual({
      x: 420,
      y: 180,
      visible: true,
    });

    worldHudAnchorStore.setVisible("enemy", false);
    expect(worldHudAnchorStore.getSnapshot().enemy).toEqual({
      x: 420,
      y: 180,
      visible: false,
    });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("does not publish unchanged anchors", () => {
    const listener = vi.fn();
    const unsubscribe = worldHudAnchorStore.subscribe(listener);

    worldHudAnchorStore.setAnchor("player", { x: 200, y: 160, visible: true });
    worldHudAnchorStore.setAnchor("player", { x: 200, y: 160, visible: true });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
