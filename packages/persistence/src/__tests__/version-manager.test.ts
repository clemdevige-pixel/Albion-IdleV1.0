import { describe, it, expect } from "vitest";
import { VersionManager } from "../version-manager.js";

describe("VersionManager", () => {
  const vm = new VersionManager(3);

  it("reports current version", () => {
    expect(vm.currentVersion).toBe(3);
  });

  it("detects old versions", () => {
    expect(vm.isOld(1)).toBe(true);
    expect(vm.isOld(2)).toBe(true);
    expect(vm.isOld(3)).toBe(false);
  });

  it("detects current version", () => {
    expect(vm.isCurrent(3)).toBe(true);
    expect(vm.isCurrent(2)).toBe(false);
  });

  it("detects future versions", () => {
    expect(vm.isFuture(4)).toBe(true);
    expect(vm.isFuture(3)).toBe(false);
  });
});
