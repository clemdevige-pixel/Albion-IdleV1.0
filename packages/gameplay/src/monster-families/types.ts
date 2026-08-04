import type { Brand } from "@game/core";
import type { StatId, ModifierType } from "../stats/types.js";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type MonsterFamilyId = Brand<string, "MonsterFamilyId">;

export function asMonsterFamilyId(s: string): MonsterFamilyId {
  return s as MonsterFamilyId;
}

export type FamilyTraitId = Brand<string, "FamilyTraitId">;

export function asFamilyTraitId(s: string): FamilyTraitId {
  return s as FamilyTraitId;
}

export type FamilyModifierId = Brand<string, "FamilyModifierId">;

export function asFamilyModifierId(s: string): FamilyModifierId {
  return s as FamilyModifierId;
}

// ---------------------------------------------------------------------------
// Family trait — shared characteristic (e.g. damage type, resistance profile)
// ---------------------------------------------------------------------------

export interface FamilyTrait {
  readonly id: FamilyTraitId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Family modifier — stat modifier inherited from family
// ---------------------------------------------------------------------------

export interface FamilyModifier {
  readonly id: FamilyModifierId;
  readonly statId: StatId;
  readonly type: ModifierType;
  readonly value: number;
}

// ---------------------------------------------------------------------------
// Monster family definition
// ---------------------------------------------------------------------------

export interface MonsterFamilyDefinition {
  readonly id: MonsterFamilyId;
  readonly name: string;
  readonly description: string;
  readonly faction: string;
  readonly traits: readonly FamilyTrait[];
  readonly modifiers: readonly FamilyModifier[];
  readonly defaultRole: string;
  readonly defaultTier: number;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Resolved monster properties (family defaults merged with individual overrides)
// ---------------------------------------------------------------------------

export interface ResolvedFamilyProperties {
  readonly familyId: MonsterFamilyId;
  readonly familyName: string;
  readonly faction: string;
  readonly role: string;
  readonly tier: number;
  readonly traits: readonly FamilyTrait[];
  readonly modifiers: readonly FamilyModifier[];
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Override spec — what individual monsters may override
// ---------------------------------------------------------------------------

export interface MonsterFamilyOverrides {
  readonly role?: string | undefined;
  readonly tier?: number | undefined;
  readonly additionalTraits?: readonly FamilyTrait[] | undefined;
  readonly additionalModifiers?: readonly FamilyModifier[] | undefined;
  readonly removedTraitIds?: readonly FamilyTraitId[] | undefined;
  readonly removedModifierIds?: readonly FamilyModifierId[] | undefined;
  readonly additionalTags?: readonly string[] | undefined;
}

// ---------------------------------------------------------------------------
// Result pattern
// ---------------------------------------------------------------------------

export type MonsterFamilyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: MonsterFamilyFailureReason };

export type MonsterFamilyFailureReason =
  | "family_not_found"
  | "family_already_registered"
  | "invalid_family_definition";
