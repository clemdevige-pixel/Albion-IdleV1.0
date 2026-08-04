import { describe, it, expect } from "vitest";
import { serialize, computeChecksum } from "../serializer.js";

describe("serialize", () => {
  it("produces deterministic output with sorted keys", () => {
    const a = serialize({ z: 1, a: 2, m: 3 });
    const b = serialize({ a: 2, m: 3, z: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"m":3,"z":1}');
  });

  it("sorts nested keys", () => {
    const result = serialize({ b: { d: 1, c: 2 }, a: 0 });
    expect(result).toBe('{"a":0,"b":{"c":2,"d":1}}');
  });

  it("handles arrays without reordering elements", () => {
    const result = serialize({ items: [3, 1, 2] });
    expect(result).toBe('{"items":[3,1,2]}');
  });

  it("roundtrips through JSON.parse", () => {
    const data = { foo: "bar", nested: { x: [1, 2] } };
    const raw = serialize(data);
    expect(JSON.parse(raw)).toEqual(data);
  });
});

describe("computeChecksum", () => {
  it("is deterministic regardless of key order", () => {
    const a = computeChecksum({ z: 1, a: 2 });
    const b = computeChecksum({ a: 2, z: 1 });
    expect(a).toBe(b);
  });

  it("differs for different data", () => {
    const a = computeChecksum({ x: 1 });
    const b = computeChecksum({ x: 2 });
    expect(a).not.toBe(b);
  });

  it("returns an 8-char hex string", () => {
    const result = computeChecksum({ test: true });
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });
});
