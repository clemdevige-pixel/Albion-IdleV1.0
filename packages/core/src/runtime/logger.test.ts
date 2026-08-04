import { describe, it, expect, vi } from "vitest";
import {
  createSilentLogger,
  createMemoryLogger,
  createConsoleLogger,
} from "./logger.js";

describe("createSilentLogger", () => {
  it("does not throw on any level", () => {
    const logger = createSilentLogger();
    expect(() => logger.debug("x")).not.toThrow();
    expect(() => logger.info("x")).not.toThrow();
    expect(() => logger.warn("x")).not.toThrow();
    expect(() => logger.error("x")).not.toThrow();
  });
});

describe("createMemoryLogger", () => {
  it("stores entries for each level", () => {
    const logger = createMemoryLogger();
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(logger.entries).toHaveLength(4);
    expect(logger.entries.map((e) => e.level)).toEqual(["debug", "info", "warn", "error"]);
  });

  it("records context and error", () => {
    const logger = createMemoryLogger();
    const err = new Error("boom");
    logger.error("fail", { key: "val" }, err);
    expect(logger.entries[0]?.context).toEqual({ key: "val" });
    expect(logger.entries[0]?.error).toBe(err);
  });

  it("records tick from provider", () => {
    let tick = 0;
    const logger = createMemoryLogger({ tick: () => tick });
    tick = 5;
    logger.info("at five");
    expect(logger.entries[0]?.tick).toBe(5);
  });

  it("records service name", () => {
    const logger = createMemoryLogger({ service: "test-svc" });
    logger.info("msg");
    expect(logger.entries[0]?.service).toBe("test-svc");
  });

  it("clear removes all entries", () => {
    const logger = createMemoryLogger();
    logger.info("a");
    logger.info("b");
    logger.clear();
    expect(logger.entries).toHaveLength(0);
  });
});

describe("createConsoleLogger", () => {
  it("calls console methods", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const logger = createConsoleLogger();
    logger.info("hello");
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
