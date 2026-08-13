import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("server deployment configuration", () => {
  it("uses the managed-host PORT when SERVER_PORT is absent", () => {
    const config = loadConfig({ PORT: "4321" });

    expect(config.port).toBe(4321);
  });

  it("keeps SERVER_PORT as the explicit override", () => {
    const config = loadConfig({ PORT: "4321", SERVER_PORT: "3001" });

    expect(config.port).toBe(3001);
  });
});
