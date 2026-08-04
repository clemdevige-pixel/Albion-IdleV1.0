import { describe, it, expect } from "vitest";
import { canTransition } from "../resource-lifecycle.js";

describe("canTransition", () => {
  it("available -> depleted", () => {
    expect(canTransition("available", "depleted")).toBe(true);
  });

  it("available -> destroyed", () => {
    expect(canTransition("available", "destroyed")).toBe(true);
  });

  it("available -> respawning is invalid", () => {
    expect(canTransition("available", "respawning")).toBe(false);
  });

  it("available -> available is invalid", () => {
    expect(canTransition("available", "available")).toBe(false);
  });

  it("depleted -> respawning", () => {
    expect(canTransition("depleted", "respawning")).toBe(true);
  });

  it("depleted -> destroyed", () => {
    expect(canTransition("depleted", "destroyed")).toBe(true);
  });

  it("depleted -> available is invalid", () => {
    expect(canTransition("depleted", "available")).toBe(false);
  });

  it("respawning -> available", () => {
    expect(canTransition("respawning", "available")).toBe(true);
  });

  it("respawning -> destroyed", () => {
    expect(canTransition("respawning", "destroyed")).toBe(true);
  });

  it("destroyed -> any is invalid", () => {
    expect(canTransition("destroyed", "available")).toBe(false);
    expect(canTransition("destroyed", "depleted")).toBe(false);
    expect(canTransition("destroyed", "respawning")).toBe(false);
    expect(canTransition("destroyed", "destroyed")).toBe(false);
  });
});
