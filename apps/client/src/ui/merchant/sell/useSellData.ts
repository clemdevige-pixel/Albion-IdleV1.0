import { useMemo } from "react";
import { useMerchantData } from "../useMerchantData";
import { buildSellModel, type SellModel } from "./sellModels";

export function useSellData(): SellModel {
  const snapshot = useMerchantData();
  return useMemo(() => buildSellModel(snapshot), [snapshot]);
}
