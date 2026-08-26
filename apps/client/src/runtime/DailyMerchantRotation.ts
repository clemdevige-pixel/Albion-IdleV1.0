import {
  DAILY_MERCHANT_ALL_CANDIDATES,
  DAILY_MERCHANT_CATEGORIES,
  DAILY_MERCHANT_CATEGORY_WEIGHTS,
  DAILY_MERCHANT_QUANTITIES,
  DAILY_MERCHANT_ROTATION_RULES,
  DAILY_MERCHANT_TIERS,
  type DailyMerchantCandidate,
  type DailyMerchantCategory,
  type DailyMerchantTier,
} from "@game/data";
import type { SaveProvider } from "@game/persistence";

export interface DailyMerchantOffer {
  readonly offerId: string;
  readonly itemId: string;
  readonly category: DailyMerchantCategory;
  readonly tier: DailyMerchantTier;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
  readonly purchased: boolean;
}

export interface DailyMerchantSavedOffer {
  readonly offerId: string;
  readonly itemId: string;
  readonly category: DailyMerchantCategory;
  readonly tier: DailyMerchantTier;
  readonly quantity: number;
  readonly unitPrice: number;
}

interface DailyMerchantSavedState {
  readonly rotationId: string;
  readonly unlockedTiers: readonly DailyMerchantTier[];
  readonly offers: readonly DailyMerchantSavedOffer[];
  readonly purchasedOfferIds: readonly string[];
}

interface MutableDailyMerchantState {
  rotationId: string;
  unlockedTiers: DailyMerchantTier[];
  offers: DailyMerchantSavedOffer[];
  purchasedOfferIds: Set<string>;
}

const HOUR_MS = 60 * 60 * 1_000;

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isDailyMerchantTier(value: unknown): value is DailyMerchantTier {
  return typeof value === "number"
    && DAILY_MERCHANT_TIERS.some((tier) => tier === value);
}

function isDailyMerchantCategory(value: unknown): value is DailyMerchantCategory {
  return typeof value === "string"
    && DAILY_MERCHANT_CATEGORIES.some((category) => category === value);
}

function normalizeUnlockedTiers(values: readonly number[]): DailyMerchantTier[] {
  return [...new Set(values.filter(isDailyMerchantTier))].sort((a, b) => a - b);
}

function parseSavedOffer(value: unknown): DailyMerchantSavedOffer | undefined {
  if (!isUnknownRecord(value)) return undefined;

  const { offerId, itemId, category, tier, quantity, unitPrice } = value;
  if (
    typeof offerId !== "string"
    || typeof itemId !== "string"
    || !isDailyMerchantCategory(category)
    || !isDailyMerchantTier(tier)
    || typeof quantity !== "number"
    || !Number.isSafeInteger(quantity)
    || quantity < 1
    || typeof unitPrice !== "number"
    || !Number.isSafeInteger(unitPrice)
    || unitPrice < 1
  ) {
    return undefined;
  }

  return {
    offerId,
    itemId,
    category,
    tier,
    quantity,
    unitPrice,
  };
}

export function getDailyMerchantRotationId(nowMs: number = Date.now()): string {
  const shifted = new Date(nowMs - DAILY_MERCHANT_ROTATION_RULES.resetHourUtc * HOUR_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
}

export function getDailyMerchantNextResetAt(nowMs: number = Date.now()): number {
  const shifted = new Date(nowMs - DAILY_MERCHANT_ROTATION_RULES.resetHourUtc * HOUR_MS);
  return Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
    DAILY_MERCHANT_ROTATION_RULES.resetHourUtc,
  );
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seedText: string): () => number {
  let state = hashString(seedText) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne<T>(values: readonly T[], random: () => number): T {
  const index = Math.min(values.length - 1, Math.floor(random() * values.length));
  const value = values[index];
  if (value === undefined) throw new Error("Cannot pick from an empty daily merchant pool");
  return value;
}

function pickWeightedCategory(
  random: () => number,
  allowed: readonly DailyMerchantCategory[],
): DailyMerchantCategory {
  const totalWeight = allowed.reduce(
    (sum, category) => sum + DAILY_MERCHANT_CATEGORY_WEIGHTS[category],
    0,
  );
  let cursor = random() * totalWeight;
  for (const category of allowed) {
    cursor -= DAILY_MERCHANT_CATEGORY_WEIGHTS[category];
    if (cursor < 0) return category;
  }
  return pickOne(allowed, random);
}

function candidatesFor(
  tier: DailyMerchantTier,
  category: DailyMerchantCategory,
): readonly DailyMerchantCandidate[] {
  return DAILY_MERCHANT_ALL_CANDIDATES.filter((candidate) => (
    candidate.tier === tier && candidate.category === category
  ));
}

function buildOffer(
  slotIndex: number,
  tier: DailyMerchantTier,
  category: DailyMerchantCategory,
  random: () => number,
): DailyMerchantSavedOffer {
  const candidate = pickOne(candidatesFor(tier, category), random);
  const quantity = pickOne(DAILY_MERCHANT_QUANTITIES[category], random);
  return {
    offerId: `daily_${String(slotIndex)}_${tier}_${category}_${candidate.itemId}`,
    itemId: candidate.itemId,
    category,
    tier,
    quantity,
    unitPrice: candidate.unitPrice,
  };
}

function countCategories(
  offers: readonly DailyMerchantSavedOffer[],
  categories: readonly DailyMerchantCategory[],
): number {
  return offers.filter((offer) => (
    categories.some((category) => category === offer.category)
  )).length;
}

function getAllowedCategories(
  offers: readonly DailyMerchantSavedOffer[],
): readonly DailyMerchantCategory[] {
  return DAILY_MERCHANT_CATEGORIES.filter((category) => (
    DAILY_MERCHANT_ROTATION_RULES.limitedCategoryGroups.every((group) => (
      !group.categories.some((groupCategory) => groupCategory === category)
      || countCategories(offers, group.categories) < group.maximumPerRotation
    ))
  ));
}

function applyGuaranteedCategoryGroups(
  offers: DailyMerchantSavedOffer[],
  unlockedTiers: readonly DailyMerchantTier[],
  random: () => number,
): void {
  for (const group of DAILY_MERCHANT_ROTATION_RULES.guaranteedCategoryGroups) {
    if (countCategories(offers, group) > 0) continue;

    const replacementIndex = offers.length - 1;
    const tier = pickOne(unlockedTiers, random);
    const category = pickWeightedCategory(random, group);
    offers[replacementIndex] = buildOffer(replacementIndex, tier, category, random);
  }
}

export function generateDailyMerchantOffers(
  rotationId: string,
  unlockedTierValues: readonly number[],
): readonly DailyMerchantSavedOffer[] {
  const unlockedTiers = normalizeUnlockedTiers(unlockedTierValues);
  if (unlockedTiers.length === 0) return [];

  const random = createSeededRandom(`${rotationId}|${unlockedTiers.join(",")}`);
  const offers: DailyMerchantSavedOffer[] = [];

  for (
    let slotIndex = 0;
    slotIndex < DAILY_MERCHANT_ROTATION_RULES.offerCount;
    slotIndex += 1
  ) {
    const tier = pickOne(unlockedTiers, random);
    const category = pickWeightedCategory(random, getAllowedCategories(offers));
    offers.push(buildOffer(slotIndex, tier, category, random));
  }

  applyGuaranteedCategoryGroups(offers, unlockedTiers, random);
  return offers;
}

export class DailyMerchantRotationSaveProvider implements SaveProvider {
  readonly providerId = "daily_merchant_rotation";

  private state: MutableDailyMerchantState | null = null;

  ensureRotation(nowMs: number, unlockedTierValues: readonly number[]): void {
    const rotationId = getDailyMerchantRotationId(nowMs);
    const unlockedTiers = normalizeUnlockedTiers(unlockedTierValues);
    if (this.state?.rotationId === rotationId) {
      if (this.state.unlockedTiers.length > 0 || unlockedTiers.length === 0) return;
    }

    this.state = {
      rotationId,
      unlockedTiers,
      offers: [...generateDailyMerchantOffers(rotationId, unlockedTiers)],
      purchasedOfferIds: new Set(),
    };
  }

  getOffers(nowMs: number, unlockedTierValues: readonly number[]): readonly DailyMerchantOffer[] {
    this.ensureRotation(nowMs, unlockedTierValues);
    if (this.state === null) return [];
    return this.state.offers.map((offer) => ({
      ...offer,
      totalPrice: offer.unitPrice * offer.quantity,
      purchased: this.state!.purchasedOfferIds.has(offer.offerId),
    }));
  }

  canPurchase(offerId: string, nowMs: number, unlockedTierValues: readonly number[]): boolean {
    this.ensureRotation(nowMs, unlockedTierValues);
    if (this.state === null || this.state.purchasedOfferIds.has(offerId)) return false;
    return this.state.offers.some((offer) => offer.offerId === offerId);
  }

  markPurchased(offerId: string): boolean {
    if (this.state === null || !this.state.offers.some((offer) => offer.offerId === offerId)) {
      return false;
    }
    if (this.state.purchasedOfferIds.has(offerId)) return false;
    this.state.purchasedOfferIds.add(offerId);
    return true;
  }

  isPurchased(offerId: string): boolean {
    return this.state?.purchasedOfferIds.has(offerId) ?? false;
  }

  reset(): void {
    this.state = null;
  }

  save(): unknown {
    if (this.state === null) return null;
    return {
      rotationId: this.state.rotationId,
      unlockedTiers: [...this.state.unlockedTiers],
      offers: this.state.offers.map((offer) => ({ ...offer })),
      purchasedOfferIds: [...this.state.purchasedOfferIds],
    } satisfies DailyMerchantSavedState;
  }

  load(data: unknown): void {
    if (!isUnknownRecord(data)) {
      this.reset();
      return;
    }

    const { rotationId, unlockedTiers: rawUnlockedTiers, offers: rawOffers } = data;
    if (
      typeof rotationId !== "string"
      || !isUnknownArray(rawUnlockedTiers)
      || !isUnknownArray(rawOffers)
    ) {
      this.reset();
      return;
    }

    const unlockedTiers = normalizeUnlockedTiers(
      rawUnlockedTiers.filter((value): value is number => typeof value === "number"),
    );
    const offers = rawOffers.flatMap((value): DailyMerchantSavedOffer[] => {
      const offer = parseSavedOffer(value);
      return offer === undefined ? [] : [offer];
    });
    const validOfferIds = new Set(offers.map((offer) => offer.offerId));
    const rawPurchasedOfferIds = data.purchasedOfferIds;
    const purchasedOfferIds = new Set(
      isUnknownArray(rawPurchasedOfferIds)
        ? rawPurchasedOfferIds.filter((value): value is string => (
            typeof value === "string" && validOfferIds.has(value)
          ))
        : [],
    );

    if (offers.length !== DAILY_MERCHANT_ROTATION_RULES.offerCount) {
      this.reset();
      return;
    }

    this.state = {
      rotationId,
      unlockedTiers,
      offers,
      purchasedOfferIds,
    };
  }
}

export const dailyMerchantRotation = new DailyMerchantRotationSaveProvider();
