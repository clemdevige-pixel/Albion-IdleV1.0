import type { SaveProvider } from "@game/persistence";
import type { ItemInstanceId } from "../inventory/types.js";
import type { AwakenedWeaponService } from "./awakening-service.js";
import type {
  AwakenedTraitId,
  AwakenedTraitOffer,
  AwakenedTraitRollResult,
  AwakenedWeaponState,
  AwakenedWeaponTier,
} from "./types.js";

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
  weapons: SavedAwakenedWeaponState[];
}

const TRAITS = new Set<AwakenedTraitId>([
  "item_power",
  "damage",
  "ability_power",
  "cooldown_reduction",
  "max_health",
  "armor",
  "magic_resistance",
]);

function isTier(value: number): value is AwakenedWeaponTier {
  return Number.isInteger(value) && value >= 4 && value <= 8;
}

function isTrait(value: string): value is AwakenedTraitId {
  return TRAITS.has(value as AwakenedTraitId);
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function restoreRoll(saved: SavedAwakenedRoll): AwakenedTraitRollResult {
  if (!isTrait(saved.traitId)) throw new Error(`Invalid awakening save: trait ${saved.traitId}`);
  if (!finiteNonNegative(saved.baseRoll) || !finiteNonNegative(saved.finalGain)) {
    throw new Error("Invalid awakening save: invalid roll value");
  }
  return {
    traitId: saved.traitId,
    baseRoll: saved.baseRoll,
    critical: saved.critical === true,
    finalGain: saved.finalGain,
  };
}

function restoreOffer(saved: SavedAwakenedOffer): AwakenedTraitOffer {
  if (saved.kind !== "fill" && saved.kind !== "reroll") {
    throw new Error(`Invalid awakening save: offer kind ${saved.kind}`);
  }
  if (!Number.isInteger(saved.targetIndex) || saved.targetIndex < 0 || saved.targetIndex > 2) {
    throw new Error("Invalid awakening save: offer target");
  }
  if (!Array.isArray(saved.proposals) || saved.proposals.length === 0) {
    throw new Error("Invalid awakening save: empty offer");
  }
  return {
    kind: saved.kind,
    targetIndex: saved.targetIndex,
    proposals: saved.proposals.map(restoreRoll),
  };
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
    return { weapons } satisfies AwakeningSavePayload;
  }

  load(data: unknown): void {
    const payload = data as Partial<AwakeningSavePayload>;
    if (!Array.isArray(payload.weapons)) throw new Error("Invalid awakening save: missing weapons");

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
      if (!Array.isArray(saved.traits) || saved.traits.length > 3) {
        throw new Error("Invalid awakening save: invalid traits");
      }
      const traitIds = new Set<AwakenedTraitId>();
      const traits = saved.traits.map((trait) => {
        if (!isTrait(trait.traitId)) throw new Error(`Invalid awakening save: trait ${trait.traitId}`);
        if (traitIds.has(trait.traitId)) throw new Error("Invalid awakening save: duplicate trait");
        traitIds.add(trait.traitId);
        if (!finiteNonNegative(trait.value)) throw new Error("Invalid awakening save: invalid trait value");
        return { traitId: trait.traitId, value: trait.value };
      });
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
          pendingTraitOffer: restoreOffer(saved.pendingTraitOffer),
        }),
      };
    });

    this.service._restore(states);
  }
}
