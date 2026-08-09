import type { MerchantSnapshot } from "../merchantModels";
import { getOwnedItemTotals } from "../merchantModels";

export interface SellOfferModel {
  readonly itemId: string;
  readonly unitPrice: number;
  readonly owned: number;
  readonly maximumPerTransaction: number | null;
}

export interface SellModel {
  readonly silver: number;
  readonly incomeRate: number;
  readonly offers: readonly SellOfferModel[];
}

export function buildSellModel(snapshot: MerchantSnapshot): SellModel {
  const owned = getOwnedItemTotals(snapshot.inventory);
  return {
    silver: snapshot.wallet.silver,
    incomeRate: snapshot.wallet.incomeRate,
    offers: snapshot.vendor.offers.flatMap((offer) => {
      const quantity = owned.get(offer.itemId) ?? 0;
      return offer.sellPrice === null || quantity === 0 ? [] : [{
        itemId: offer.itemId,
        unitPrice: offer.sellPrice,
        owned: quantity,
        maximumPerTransaction: offer.maxPerTransaction,
      }];
    }),
  };
}
