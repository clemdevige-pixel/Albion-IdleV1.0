import { describe, it, expect } from "vitest";
import { SnapshotBuilder } from "../snapshot-builder.js";
import { SnapshotLoader } from "../snapshot-loader.js";
import type { SaveProvider } from "../save-provider.js";

class TestProvider implements SaveProvider {
  readonly providerId: string;
  state: unknown;

  constructor(id: string, initial: unknown) {
    this.providerId = id;
    this.state = initial;
  }

  save(): unknown {
    return this.state;
  }

  load(data: unknown): void {
    this.state = data;
  }
}

describe("SnapshotBuilder", () => {
  it("collects state from all providers", () => {
    const builder = new SnapshotBuilder();
    builder.register(new TestProvider("a", { x: 1 }));
    builder.register(new TestProvider("b", { y: 2 }));

    const payload = builder.build();
    expect(payload).toEqual({ a: { x: 1 }, b: { y: 2 } });
  });
});

describe("SnapshotLoader", () => {
  it("restores state to matching providers", () => {
    const loader = new SnapshotLoader();
    const p = new TestProvider("a", null);
    loader.register(p);

    loader.load({ a: { restored: true } });
    expect(p.state).toEqual({ restored: true });
  });

  it("skips providers not in payload", () => {
    const loader = new SnapshotLoader();
    const p = new TestProvider("missing", "original");
    loader.register(p);

    loader.load({});
    expect(p.state).toBe("original");
  });
});
