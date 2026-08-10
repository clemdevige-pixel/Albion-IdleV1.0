import { describe, expect, it } from "vitest";
import { resolveAspectPreservingDisplaySize } from "./aspectRatio";

describe("resolveAspectPreservingDisplaySize", () => {
  it("preserves a wide texture ratio from target height", () => {
    const size = resolveAspectPreservingDisplaySize(400, 200, 150);
    expect(size).toEqual({ width: 300, height: 150 });
  });

  it("preserves a tall texture ratio from target height", () => {
    const size = resolveAspectPreservingDisplaySize(200, 400, 180);
    expect(size).toEqual({ width: 90, height: 180 });
  });

  it("rejects invalid dimensions", () => {
    expect(() => resolveAspectPreservingDisplaySize(0, 100, 100)).toThrow();
    expect(() => resolveAspectPreservingDisplaySize(100, 0, 100)).toThrow();
    expect(() => resolveAspectPreservingDisplaySize(100, 100, 0)).toThrow();
  });
});
