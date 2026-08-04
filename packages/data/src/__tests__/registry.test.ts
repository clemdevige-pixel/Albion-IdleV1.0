import { describe, expect, it } from "vitest";
import { DataRegistry } from "../registry.js";
import { asDataId } from "../data-id.js";

interface TestRecord {
  readonly id: string;
  readonly value: number;
}

function makeRegistry(): DataRegistry<TestRecord, "test"> {
  const entries = new Map<string, TestRecord>();
  entries.set("beta", { id: "beta", value: 2 });
  entries.set("alpha", { id: "alpha", value: 1 });
  entries.set("gamma", { id: "gamma", value: 3 });
  return new DataRegistry(entries);
}

describe("DataRegistry", () => {
  it("get returns the record for a known id", () => {
    const reg = makeRegistry();
    expect(reg.get(asDataId("alpha"))).toEqual({ id: "alpha", value: 1 });
  });

  it("get throws on unknown id", () => {
    const reg = makeRegistry();
    expect(() => reg.get(asDataId("unknown"))).toThrow("Unknown data ID");
  });

  it("tryGet returns undefined on unknown id", () => {
    const reg = makeRegistry();
    expect(reg.tryGet(asDataId("unknown"))).toBeUndefined();
  });

  it("has returns true for existing, false for missing", () => {
    const reg = makeRegistry();
    expect(reg.has(asDataId("beta"))).toBe(true);
    expect(reg.has(asDataId("nope"))).toBe(false);
  });

  it("getAll returns records in sorted order by id", () => {
    const reg = makeRegistry();
    const all = reg.getAll();
    expect(all.map((r) => r.id)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("getIds returns ids in sorted order", () => {
    const reg = makeRegistry();
    expect([...reg.getIds()]).toEqual(["alpha", "beta", "gamma"]);
  });

  it("getCount returns the number of records", () => {
    const reg = makeRegistry();
    expect(reg.getCount()).toBe(3);
  });

  it("empty registry works", () => {
    const reg = new DataRegistry<TestRecord>(new Map());
    expect(reg.getAll()).toEqual([]);
    expect(reg.getCount()).toBe(0);
  });
});
