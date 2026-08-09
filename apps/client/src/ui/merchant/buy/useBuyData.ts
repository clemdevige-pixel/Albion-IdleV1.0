import { useMemo } from "react";
import { useMerchantData } from "../useMerchantData";
import { buildBuyModel, type BuyModel } from "./buyModels";

export function useBuyData(): BuyModel {
  const snapshot = useMerchantData();
  return useMemo(() => buildBuyModel(snapshot), [snapshot]);
}
