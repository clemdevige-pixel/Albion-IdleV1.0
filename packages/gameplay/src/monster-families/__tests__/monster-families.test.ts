import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@game/core";
import type { StatId, ModifierType } from "../../stats/types.js";
import { MonsterFamilyRegistry } from "../monster-family-registry.js";
import { MonsterFamilyResolver } from "../monster-family-resolver.js";
import {
  asMonsterFamilyId,
  asFamilyTraitId,
  asFamilyModifierId,
} from "../types.js";
import type {
  MonsterFamilyDefinition,
  FamilyTrait,
  FamilyModifier,
  MonsterFamilyOverrides,
} from "../types.js";
import type {
  MonsterFamilyEventMap,
  MonsterFamilyRegisteredEvent,
  MonsterFamilyUnregisteredEvent,
} from "../monster-family-events.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAT_ARMOR = "stat_armor" as StatId;
const STAT_MAGIC_RESIST = "stat_magic_resist" as StatId;


function makeTrait(id: string, name: string, tags: readonly string[] = []): FamilyTrait {
  return { id: asFamilyTraitId(id), name, description: `${name} desc`, tags };
}

function makeModifier(
  id: string,
  statId: StatId,
  type: ModifierType,
  value: number,
): FamilyModifier {
  return { id: asFamilyModifierId(id), statId, type, value };
}

function makeFamily(
  id: string = "undead",
  overrides: Partial<MonsterFamilyDefinition> = {},
): MonsterFamilyDefinition {
  return {
    id: asMonsterFamilyId(id),
    name: "Undead",
    description: "Risen dead creatures",
    faction: "Undead",
    traits: [makeTrait("trait_undead", "Undead Nature", ["undead"])],
    modifiers: [makeModifier("mod_armor", STAT_ARMOR, "flat", 10)],
    defaultRole: "Melee Fighter",
    defaultTier: 3,
    tags: ["undead", "humanoid"],
    ...overrides,
  };
}

// ===========================================================================
// MonsterFamilyRegistry
// ===========================================================================

describe("MonsterFamilyRegistry", () => {
  let eventBus: EventBus<MonsterFamilyEventMap>;
  let registry: MonsterFamilyRegistry;

  beforeEach(() => {
    eventBus = new EventBus<MonsterFamilyEventMap>();
    registry = new MonsterFamilyRegistry(eventBus);
  });

  it("registers a family and retrieves it", () => {
    const family = makeFamily();
    const result = registry.register(family);
    expect(result.ok).toBe(true);

    const got = registry.get(family.id);
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.name).toBe("Undead");
    }
  });

  it("rejects duplicate registration", () => {
    registry.register(makeFamily());
    const result = registry.register(makeFamily());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("family_already_registered");
    }
  });

  it("rejects invalid family (empty name)", () => {
    const result = registry.register(makeFamily("bad", { name: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_family_definition");
    }
  });

  it("rejects invalid family (empty faction)", () => {
    const result = registry.register(makeFamily("bad", { faction: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_family_definition");
    }
  });

  it("returns family_not_found for unknown id", () => {
    const result = registry.get(asMonsterFamilyId("nope"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("family_not_found");
    }
  });

  it("has() returns correct boolean", () => {
    const family = makeFamily();
    expect(registry.has(family.id)).toBe(false);
    registry.register(family);
    expect(registry.has(family.id)).toBe(true);
  });

  it("getAll() returns all registered families", () => {
    registry.register(makeFamily("a", { name: "A", faction: "A" }));
    registry.register(makeFamily("b", { name: "B", faction: "B" }));
    expect(registry.getAll()).toHaveLength(2);
  });

  it("getByFaction() filters correctly", () => {
    registry.register(makeFamily("a", { name: "A", faction: "Undead" }));
    registry.register(makeFamily("b", { name: "B", faction: "Morgana" }));
    expect(registry.getByFaction("Undead")).toHaveLength(1);
    expect(registry.getByFaction("Morgana")).toHaveLength(1);
    expect(registry.getByFaction("None")).toHaveLength(0);
  });

  it("count() tracks registrations", () => {
    expect(registry.count()).toBe(0);
    registry.register(makeFamily());
    expect(registry.count()).toBe(1);
  });

  it("unregister removes a family", () => {
    const family = makeFamily();
    registry.register(family);
    const result = registry.unregister(family.id);
    expect(result.ok).toBe(true);
    expect(registry.has(family.id)).toBe(false);
  });

  it("unregister fails for unknown family", () => {
    const result = registry.unregister(asMonsterFamilyId("nope"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("family_not_found");
    }
  });

  it("emits monsterFamilyRegistered event", () => {
    const events: MonsterFamilyRegisteredEvent[] = [];
    eventBus.subscribe("monsterFamilyRegistered", (e) => events.push(e));
    const family = makeFamily();
    registry.register(family);
    expect(events).toHaveLength(1);
    expect(events[0]!.familyId).toBe(family.id);
    expect(events[0]!.name).toBe("Undead");
  });

  it("emits monsterFamilyUnregistered event", () => {
    const events: MonsterFamilyUnregisteredEvent[] = [];
    eventBus.subscribe("monsterFamilyUnregistered", (e) => events.push(e));
    const family = makeFamily();
    registry.register(family);
    registry.unregister(family.id);
    expect(events).toHaveLength(1);
    expect(events[0]!.familyId).toBe(family.id);
  });

  it("does not emit event on failed registration", () => {
    const events: MonsterFamilyRegisteredEvent[] = [];
    eventBus.subscribe("monsterFamilyRegistered", (e) => events.push(e));
    registry.register(makeFamily("bad", { name: "" }));
    expect(events).toHaveLength(0);
  });
});

// ===========================================================================
// MonsterFamilyResolver
// ===========================================================================

describe("MonsterFamilyResolver", () => {
  let eventBus: EventBus<MonsterFamilyEventMap>;
  let registry: MonsterFamilyRegistry;
  let resolver: MonsterFamilyResolver;

  beforeEach(() => {
    eventBus = new EventBus<MonsterFamilyEventMap>();
    registry = new MonsterFamilyRegistry(eventBus);
    resolver = new MonsterFamilyResolver(registry);
  });

  it("resolves family defaults with no overrides", () => {
    const family = makeFamily();
    registry.register(family);
    const result = resolver.resolve(family.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.familyId).toBe(family.id);
      expect(result.value.familyName).toBe("Undead");
      expect(result.value.faction).toBe("Undead");
      expect(result.value.role).toBe("Melee Fighter");
      expect(result.value.tier).toBe(3);
      expect(result.value.traits).toHaveLength(1);
      expect(result.value.modifiers).toHaveLength(1);
      expect(result.value.tags).toEqual(["undead", "humanoid"]);
    }
  });

  it("resolves with undefined overrides same as no overrides", () => {
    const family = makeFamily();
    registry.register(family);
    const result = resolver.resolve(family.id, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.role).toBe("Melee Fighter");
    }
  });

  it("overrides role and tier", () => {
    const family = makeFamily();
    registry.register(family);
    const overrides: MonsterFamilyOverrides = { role: "Ranged", tier: 5 };
    const result = resolver.resolve(family.id, overrides);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.role).toBe("Ranged");
      expect(result.value.tier).toBe(5);
    }
  });

  it("adds additional traits", () => {
    const family = makeFamily();
    registry.register(family);
    const extra = makeTrait("trait_fire", "Fire Affinity", ["fire"]);
    const result = resolver.resolve(family.id, { additionalTraits: [extra] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.traits).toHaveLength(2);
    }
  });

  it("removes traits by id", () => {
    const family = makeFamily();
    registry.register(family);
    const result = resolver.resolve(family.id, {
      removedTraitIds: [asFamilyTraitId("trait_undead")],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.traits).toHaveLength(0);
    }
  });

  it("adds additional modifiers", () => {
    const family = makeFamily();
    registry.register(family);
    const extra = makeModifier("mod_mr", STAT_MAGIC_RESIST, "flat", 5);
    const result = resolver.resolve(family.id, { additionalModifiers: [extra] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.modifiers).toHaveLength(2);
    }
  });

  it("removes modifiers by id", () => {
    const family = makeFamily();
    registry.register(family);
    const result = resolver.resolve(family.id, {
      removedModifierIds: [asFamilyModifierId("mod_armor")],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.modifiers).toHaveLength(0);
    }
  });

  it("merges additional tags with deduplication", () => {
    const family = makeFamily();
    registry.register(family);
    const result = resolver.resolve(family.id, {
      additionalTags: ["undead", "elite"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tags).toEqual(["undead", "humanoid", "elite"]);
    }
  });

  it("fails for unknown family", () => {
    const result = resolver.resolve(asMonsterFamilyId("nope"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("family_not_found");
    }
  });

  it("can remove and add traits simultaneously", () => {
    const family = makeFamily("multi", {
      name: "Multi",
      faction: "Test",
      traits: [
        makeTrait("t1", "Trait 1"),
        makeTrait("t2", "Trait 2"),
      ],
    });
    registry.register(family);
    const result = resolver.resolve(family.id, {
      removedTraitIds: [asFamilyTraitId("t1")],
      additionalTraits: [makeTrait("t3", "Trait 3")],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.value.traits.map((t) => t.id);
      expect(ids).not.toContain(asFamilyTraitId("t1"));
      expect(ids).toContain(asFamilyTraitId("t2"));
      expect(ids).toContain(asFamilyTraitId("t3"));
    }
  });

  it("preserves family defaults when override fields are undefined", () => {
    const family = makeFamily();
    registry.register(family);
    const result = resolver.resolve(family.id, {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.role).toBe("Melee Fighter");
      expect(result.value.tier).toBe(3);
      expect(result.value.traits).toHaveLength(1);
      expect(result.value.modifiers).toHaveLength(1);
    }
  });
});
