import { DAILY_MERCHANT_CANDIDATE_ITEM_IDS } from "@game/data";
import type { MerchantSnapshot } from "../merchantModels";
import { getOwnedItemTotals } from "../merchantModels";

export interface BuyOfferModel {
  readonly itemId: string;
  readonly unitPrice: number;
  readonly owned: number;
  readonly maximumPerTransaction: number | null;
}

export interface BuyModel {
  readonly silver: number;
  readonly incomeRate: number;
  readonly offers: readonly BuyOfferModel[];
}

export function buildBuyModel(snapshot: MerchantSnapshot): BuyModel {
  const owned = getOwnedItemTotals(snapshot.inventory);
  return {
    silver: snapshot.wallet.silver,
    incomeRate: snapshot.wallet.incomeRate,
    offers: snapshot.vendor.offers.flatMap((offer) => (
      offer.buyPrice === null || DAILY_MERCHANT_CANDIDATE_ITEM_IDS.has(offer.itemId)
        ? []
        : [{
            itemId: offer.itemId,
            unitPrice: offer.buyPrice,
            owned: owned.get(offer.itemId) ?? 0,
            maximumPerTransaction: offer.maxPerTransaction,
          }]
    )),
  };
}
