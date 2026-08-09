import { useMemo } from "react";
import { useMerchantData } from "../useMerchantData";
import { buildRepairModel, type RepairModel } from "./repairModels";

export function useRepairData(): RepairModel {
  const snapshot = useMerchantData();
  return useMemo(
    () => buildRepairModel(snapshot.repair, snapshot.wallet),
    [snapshot.repair, snapshot.wallet],
  );
}
