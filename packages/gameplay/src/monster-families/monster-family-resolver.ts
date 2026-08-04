import type { MonsterFamilyRegistry } from "./monster-family-registry.js";
import type {
  MonsterFamilyId,
  MonsterFamilyOverrides,
  MonsterFamilyResult,
  ResolvedFamilyProperties,
} from "./types.js";

/**
 * Resolves a monster's final family properties by merging family defaults
 * with individual overrides. Pure data resolution — no side effects.
 */
export class MonsterFamilyResolver {
  readonly #registry: MonsterFamilyRegistry;

  constructor(registry: MonsterFamilyRegistry) {
    this.#registry = registry;
  }

  /**
   * Resolve final properties for a monster belonging to the given family,
   * with optional individual overrides.
   */
  resolve(
    familyId: MonsterFamilyId,
    overrides?: MonsterFamilyOverrides,
  ): MonsterFamilyResult<ResolvedFamilyProperties> {
    const familyResult = this.#registry.get(familyId);
    if (!familyResult.ok) {
      return familyResult;
    }

    const family = familyResult.value;

    if (overrides === undefined) {
      return {
        ok: true,
        value: {
          familyId: family.id,
          familyName: family.name,
          faction: family.faction,
          role: family.defaultRole,
          tier: family.defaultTier,
          traits: family.traits,
          modifiers: family.modifiers,
          tags: family.tags,
        },
      };
    }

    // Filter out removed traits
    const removedTraitSet = new Set(overrides.removedTraitIds ?? []);
    const baseTraits = family.traits.filter((t) => !removedTraitSet.has(t.id));
    const mergedTraits = [...baseTraits, ...(overrides.additionalTraits ?? [])];

    // Filter out removed modifiers
    const removedModSet = new Set(overrides.removedModifierIds ?? []);
    const baseModifiers = family.modifiers.filter((m) => !removedModSet.has(m.id));
    const mergedModifiers = [...baseModifiers, ...(overrides.additionalModifiers ?? [])];

    // Merge tags (deduplicated)
    const mergedTags = [...new Set([...family.tags, ...(overrides.additionalTags ?? [])])];

    return {
      ok: true,
      value: {
        familyId: family.id,
        familyName: family.name,
        faction: family.faction,
        role: overrides.role ?? family.defaultRole,
        tier: overrides.tier ?? family.defaultTier,
        traits: mergedTraits,
        modifiers: mergedModifiers,
        tags: mergedTags,
      },
    };
  }
}
