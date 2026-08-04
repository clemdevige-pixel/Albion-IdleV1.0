import {
  roleAllowsPlayerBuy,
  roleAllowsPlayerSell,
  type VendorDefinitionLike,
  type VendorOfferLike,
  type VendorResult,
  vendorFail,
  vendorOk,
} from "./types.js";

/** Enabled catalogue entries, in data order (36_VENDOR_SYSTEM: fixed data-driven inventory). */
export function listOffers(vendor: VendorDefinitionLike): readonly VendorOfferLike[] {
  return vendor.offers.filter((offer) => offer.enabled);
}

export function getOffer(
  vendor: VendorDefinitionLike,
  itemId: string,
): VendorOfferLike | undefined {
  return vendor.offers.find((offer) => offer.itemId === itemId);
}

/** True when the player can buy this item from the vendor. */
export function vendorSellsItem(vendor: VendorDefinitionLike, itemId: string): boolean {
  if (!vendor.enabled || !roleAllowsPlayerBuy(vendor.role)) {
    return false;
  }
  const offer = getOffer(vendor, itemId);
  return offer !== undefined && offer.enabled && offer.buyPrice !== null;
}

/** True when the player can sell this item to the vendor. */
export function vendorAcceptsItem(vendor: VendorDefinitionLike, itemId: string): boolean {
  if (!vendor.enabled || !roleAllowsPlayerSell(vendor.role)) {
    return false;
  }
  const offer = getOffer(vendor, itemId);
  return offer !== undefined && offer.enabled && offer.sellPrice !== null;
}

export function unitBuyPrice(
  vendor: VendorDefinitionLike,
  itemId: string,
): VendorResult<number> {
  const offer = getOffer(vendor, itemId);
  if (offer === undefined) {
    return vendorFail("offer_not_found");
  }
  if (offer.buyPrice === null) {
    return vendorFail("price_not_defined");
  }
  return vendorOk(offer.buyPrice);
}

export function unitSellPrice(
  vendor: VendorDefinitionLike,
  itemId: string,
): VendorResult<number> {
  const offer = getOffer(vendor, itemId);
  if (offer === undefined) {
    return vendorFail("offer_not_found");
  }
  if (offer.sellPrice === null) {
    return vendorFail("price_not_defined");
  }
  return vendorOk(offer.sellPrice);
}

/**
 * Total = unit price x quantity (36_VENDOR_SYSTEM "Purchase Cost"/"Sell
 * Value"), integer math with overflow detection.
 */
export function totalPrice(unitPrice: number, quantity: number): VendorResult<number> {
  if (!Number.isSafeInteger(unitPrice) || unitPrice < 1) {
    return vendorFail("price_not_defined");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return vendorFail("invalid_quantity");
  }
  const total = unitPrice * quantity;
  if (!Number.isSafeInteger(total)) {
    return vendorFail("price_overflow");
  }
  return vendorOk(total);
}
