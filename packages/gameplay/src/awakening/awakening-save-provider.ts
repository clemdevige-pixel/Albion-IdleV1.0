import type { SaveProvider } from "@game/persistence";
import type { ItemInstanceId } from "../inventory/types.js";
import type { AwakenedWeaponService } from "./awakening-service.js";
import type {
  AwakenedTraitId,
  AwakenedTraitOffer,
  AwakenedTraitRollRange,
  AwakenedTraitRollResult,
  AwakenedTraitState,
  AwakenedWeaponState,
  AwakenedWeaponTier,
} from "./types.js";

const CURRENT_AWAKENING_SAVE_VERSION = 2;
const MIGRATION_DECIMAL_SCALE = 1_000_000;

const LEGACY_V1_TRAIT_ROLLS: Readonly<Record<AwakenedTraitId, AwakenedTraitRollRange>> = {
  item_power: { min: 1, max: 3, integer: true },
  auto_attack_damage: { min: 0.2, max: 0.4 },
  ability_power: { min: 0.2, max: 0.4 },
  cooldown_reduction: { min: 0.5, max: 1 },
  max_health: { min: 3, max: 6 },
  defense: { min: 0.5, max: 1 },
  life_steal: { min: 0.2, max: 0.4 },
  fame_bonus: { min: 0.5, max: 1 },
};

interface SavedAwakenedRoll {
  traitId: string;
  baseRoll: number;
  critical: boolean;
  finalGain: number;
}

interface SavedAwakenedOffer {
  kind: string;
  targetIndex: number;
  proposals: SavedAwakenedRoll[];
}

interface SavedAwakenedWeaponState {
  itemInstanceId: string;
  tier: number;
  awakened?: boolean;
  storedAttunement: number;
  lifetimeAttunementInvested: number;
  strain: number;
  traits: Array<{ traitId: string; value: number }>;
  pendingTraitOffer?: SavedAwakenedOffer;
}

interface AwakeningSavePayload {
  version?: number;
  weapons: SavedAwakenedWeaponState[];
}

const TRAITS = new Set<AwakenedTraitId>([
  "item_power",
  "auto_attack_damage",
  "ability_power",
  "cooldown_reduction",
  "max_health",
  "defense",
  "life_steal",
  "fame_bonus",
]);

function normalizeTraitId(value: string): AwakenedTraitId | undefined {
  if (TRAITS.has(value as AwakenedTraitId)) return value as AwakenedTraitId;
  if (value === "damage") return "auto_attack_damage";
  if (value === "armor" || value === "magic_resistance") return "defense";
  return undefined;
}

function isTier(value: number): value is AwakenedWeaponTier {
  return Number.isInteger(value) && value >= 4 && value <= 8;
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function normalizeMigratedDecimal(value: number): number {
  return Math.round(value * MIGRATION_DECIMAL_SCALE) / MIGRATION_DECIMAL_SCALE;
}

function rangeAverage(range: AwakenedTraitRollRange): number {
  return (range.min + range.max) / 2;
}

function migrateLegacyTraitValue(
  traitId: AwakenedTraitId,
  value: number,
  service: AwakenedWeaponService,
): number {
  const legacyAverage = rangeAverage(LEGACY_V1_TRAIT_ROLLS[traitId]);
  const currentRange = service.getTraitRollRange(traitId);
  const currentAverage = rangeAverage(currentRange);
  const migrated = legacyAverage <= 0 ? value : value * currentAverage / legacyAverage;
  return currentRange.integer === true ? Math.round(migrated) : normalizeMigratedDecimal(migrated);
}

function migrateLegacyRoll(
  traitId: AwakenedTraitId,
  saved: SavedAwakenedRoll,
  service: AwakenedWeaponService,
): AwakenedTraitRollResult {
  const legacyRange = LEGACY_V1_TRAIT_ROLLS[traitId];
  const currentRange = service.getTraitRollRange(traitId);
  const legacyWidth = legacyRange.max - legacyRange.min;
  const percentile = legacyWidth <= 0
    ? 0
    : Math.min(1, Math.max(0, (saved.baseRoll - legacyRange.min) / legacyWidth));
  const rawBase = currentRange.min + (currentRange.max - currentRange.min) * percentile;
  const baseRoll = currentRange.integer === true ? Math.round(rawBase) : normalizeMigratedDecimal(rawBase);
  const gainMultiplier = saved.baseRoll > 0 ? saved.finalGain / saved.baseRoll : 1;
  return {
    traitId,
    baseRoll,
    critical: saved.critical === true,
    finalGain: currentRange.integer === true
      ? Math.round(baseRoll * gainMultiplier)
      : normalizeMigratedDecimal(baseRoll * gainMultiplier),
  };
}

function restoreRoll(
  saved: SavedAwakenedRoll,
  service: AwakenedWeaponService,
  migrateLegacy: boolean,
): AwakenedTraitRollResult {
  const traitId = normalizeTraitId(saved.traitId);
  if (traitId === undefined) throw new Error(`Invalid awakening save: trait ${saved.traitId}`);
  if (!finiteNonNegative(saved.baseRoll) || !finiteNonNegative(saved.finalGain)) {
    throw new Error("Invalid awakening save: invalid roll value");
  }
  if (migrateLegacy) return migrateLegacyRoll(traitId, saved, service);
  return {
    traitId,
    baseRoll: saved.baseRoll,
    critical: saved.critical === true,
    finalGain: saved.finalGain,
  };
}

function restoreOffer(
  saved: SavedAwakenedOffer,
  service: AwakenedWeaponService,
  migrateLegacy: boolean,
): AwakenedTraitOffer {
  if (saved.kind !== "fill" && saved.kind !== "reroll") {
    throw new Error(`Invalid awakening save: offer kind ${saved.kind}`);
  }
  if (!Number.isInteger(saved.targetIndex) || saved.targetIndex < 0 || saved.targetIndex > 2) {
    throw new Error("Invalid awakening save: offer target");
  }
  if (!Array.isArray(saved.proposals) || saved.proposals.length === 0) {
    throw new Error("Invalid awakening save: empty offer");
  }
  const proposalsByTrait = new Map<AwakenedTraitId, AwakenedTraitRollResult>();
  for (const savedProposal of saved.proposals) {
    const proposal = restoreRoll(savedProposal, service, migrateLegacy);
    const previous = proposalsByTrait.get(proposal.traitId);
    if (previous === undefined || proposal.baseRoll > previous.baseRoll) {
      proposalsByTrait.set(proposal.traitId, proposal);
    }
  }
  return {
    kind: saved.kind,
    targetIndex: saved.targetIndex,
    proposals: [...proposalsByTrait.values()],
  };
}

function restoreTraits(
  savedTraits: Array<{ traitId: string; value: number }>,
  service: AwakenedWeaponService,
  migrateLegacy: boolean,
): AwakenedTraitState[] {
  const traits: AwakenedTraitState[] = [];
  const traitIndex = new Map<AwakenedTraitId, number>();
  for (const saved of savedTraits) {
    const traitId = normalizeTraitId(saved.traitId);
    if (traitId === undefined) throw new Error(`Invalid awakening save: trait ${saved.traitId}`);
    if (!finiteNonNegative(saved.value)) throw new Error("Invalid awakening save: invalid trait value");
    const restoredValue = migrateLegacy
      ? migrateLegacyTraitValue(traitId, saved.value, service)
      : saved.value;
    const existingIndex = traitIndex.get(traitId);
    if (existingIndex === undefined) {
      traitIndex.set(traitId, traits.length);
      traits.push({ traitId, value: restoredValue });
      continue;
    }
    if (traitId !== "defense") throw new Error("Invalid awakening save: duplicate trait");
    const existing = traits[existingIndex];
    if (existing !== undefined) {
      const combined = existing.value + restoredValue;
      traits[existingIndex] = {
        ...existing,
        value: migrateLegacy ? normalizeMigratedDecimal(combined) : combined,
      };
    }
  }
  if (traits.length > 3) throw new Error("Invalid awakening save: invalid traits");
  return traits;
}

/** Save provider for instance-specific .4 progression, including paid pending offers. */
export class AwakeningSaveProvider implements SaveProvider {
  readonly providerId = "awakening";

  constructor(private readonly service: AwakenedWeaponService) {}

  save(): unknown {
    const weapons: SavedAwakenedWeaponState[] = this.service._snapshot().map((state) => ({
      itemInstanceId: String(state.itemInstanceId),
      tier: state.tier,
      awakened: state.awakened,
      storedAttunement: state.storedAttunement,
      lifetimeAttunementInvested: state.lifetimeAttunementInvested,
      strain: state.strain,
      traits: state.traits.map((trait) => ({ traitId: trait.traitId, value: trait.value })),
      ...(state.pendingTraitOffer === undefined ? {} : {
        pendingTraitOffer: {
          kind: state.pendingTraitOffer.kind,
          targetIndex: state.pendingTraitOffer.targetIndex,
          proposals: state.pendingTraitOffer.proposals.map((proposal) => ({ ...proposal })),
        },
      }),
    }));
    return { version: CURRENT_AWAKENING_SAVE_VERSION, weapons } satisfies AwakeningSavePayload;
  }

  load(data: unknown): void {
    const payload = data as Partial<AwakeningSavePayload>;
    if (!Array.isArray(payload.weapons)) throw new Error("Invalid awakening save: missing weapons");
    const version = payload.version ?? 1;
    if (version !== 1 && version !== CURRENT_AWAKENING_SAVE_VERSION) {
      throw new Error(`Invalid awakening save: unsupported version ${String(version)}`);
    }
    const migrateLegacy = version === 1;

    const seen = new Set<string>();
    const states: AwakenedWeaponState[] = payload.weapons.map((saved) => {
      if (typeof saved.itemInstanceId !== "string" || saved.itemInstanceId.length === 0) {
        throw new Error("Invalid awakening save: missing item instance id");
      }
      if (seen.has(saved.itemInstanceId)) throw new Error("Invalid awakening save: duplicate item instance id");
      seen.add(saved.itemInstanceId);
      if (!isTier(saved.tier)) throw new Error("Invalid awakening save: invalid tier");
      if (!Number.isSafeInteger(saved.storedAttunement) || saved.storedAttunement < 0) {
        throw new Error("Invalid awakening save: invalid stored Attunement");
      }
      if (!Number.isSafeInteger(saved.lifetimeAttunementInvested) || saved.lifetimeAttunementInvested < 0) {
        throw new Error("Invalid awakening save: invalid invested Attunement");
      }
      if (!Number.isSafeInteger(saved.strain) || saved.strain < 0) {
        throw new Error("Invalid awakening save: invalid Strain");
      }
      if (!Array.isArray(saved.traits)) throw new Error("Invalid awakening save: invalid traits");
      const traits = restoreTraits(saved.traits, this.service, migrateLegacy);
      const awakened = saved.awakened === undefined
        ? traits.length > 0 || saved.strain > 0 || saved.lifetimeAttunementInvested > 0
        : saved.awakened === true;
      if (!awakened && (traits.length > 0 || saved.strain > 0 || saved.pendingTraitOffer !== undefined)) {
        throw new Error("Invalid awakening save: unawakened weapon has awakened progression");
      }
      return {
        itemInstanceId: saved.itemInstanceId as ItemInstanceId,
        tier: saved.tier,
        awakened,
        storedAttunement: saved.storedAttunement,
        lifetimeAttunementInvested: saved.lifetimeAttunementInvested,
        strain: saved.strain,
        traits,
        ...(saved.pendingTraitOffer === undefined ? {} : {
          pendingTraitOffer: restoreOffer(saved.pendingTraitOffer, this.service, migrateLegacy),
        }),
      };
    });

    this.service._restore(states);
  }
}
