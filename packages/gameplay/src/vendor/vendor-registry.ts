import {
  VENDOR_ROLES,
  type VendorDefinitionLike,
  type VendorOfferLike,
  type VendorResult,
  vendorFail,
  vendorOk,
} from "./types.js";

/**
 * Immutable registry of vendor definitions (36_VENDOR_DATA "Runtime
 * Lifecycle": load, validate, register; invalid vendors never load).
 */
export class VendorRegistry {
  private readonly definitions = new Map<string, VendorDefinitionLike>();

  register(definition: VendorDefinitionLike): VendorResult<VendorDefinitionLike> {
    if (definition.vendorId.length === 0) {
      return vendorFail("invalid_definition");
    }
    if (this.definitions.has(definition.vendorId)) {
      return vendorFail("duplicate_vendor");
    }
    if (!VENDOR_ROLES.includes(definition.role)) {
      return vendorFail("invalid_role");
    }
    if (definition.role === "service_only" && definition.offers.length > 0) {
      return vendorFail("invalid_definition");
    }
    const seenItems = new Set<string>();
    for (const offer of definition.offers) {
      if (offer.itemId.length === 0 || seenItems.has(offer.itemId)) {
        return vendorFail("invalid_definition");
      }
      seenItems.add(offer.itemId);
      if (!isValidPrice(offer.buyPrice) || !isValidPrice(offer.sellPrice)) {
        return vendorFail("invalid_definition");
      }
      if (offer.buyPrice === null && offer.sellPrice === null) {
        return vendorFail("invalid_definition");
      }
      if (
        offer.maxPerTransaction !== null &&
        (!Number.isSafeInteger(offer.maxPerTransaction) || offer.maxPerTransaction < 1)
      ) {
        return vendorFail("invalid_definition");
      }
      // 36_VENDOR_SYSTEM "Anti-Arbitrage Rule": buying then reselling must
      // never break even or profit, so sellPrice < buyPrice when both exist.
      if (
        offer.buyPrice !== null &&
        offer.sellPrice !== null &&
        offer.sellPrice >= offer.buyPrice
      ) {
        return vendorFail("arbitrage_configuration");
      }
    }
    const frozen = freezeDefinition(definition);
    this.definitions.set(frozen.vendorId, frozen);
    return vendorOk(frozen);
  }

  has(vendorId: string): boolean {
    return this.definitions.has(vendorId);
  }

  get(vendorId: string): VendorDefinitionLike | undefined {
    return this.definitions.get(vendorId);
  }

  getAll(): readonly VendorDefinitionLike[] {
    return [...this.definitions.values()];
  }
}

function isValidPrice(price: number | null): boolean {
  return price === null || (Number.isSafeInteger(price) && price >= 1);
}

function freezeDefinition(definition: VendorDefinitionLike): VendorDefinitionLike {
  const offers: readonly VendorOfferLike[] = Object.freeze(
    definition.offers.map((offer) =>
      Object.freeze({
        itemId: offer.itemId,
        buyPrice: offer.buyPrice,
        sellPrice: offer.sellPrice,
        maxPerTransaction: offer.maxPerTransaction,
        enabled: offer.enabled,
      }),
    ),
  );
  return Object.freeze({
    vendorId: definition.vendorId,
    role: definition.role,
    enabled: definition.enabled,
    offers,
  });
}
