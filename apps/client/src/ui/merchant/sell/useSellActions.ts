import { GENERAL_VENDOR_ID } from "@game/data";
import { useVendorTransactionExecutor } from "../shared/useVendorTransactionExecutor";

interface SellRequest {
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly incomeRate: number;
}

export function useSellActions(): { readonly sell: (request: SellRequest) => boolean } {
  const execute = useVendorTransactionExecutor();
  return {
    sell: (request) => execute({ vendorId: GENERAL_VENDOR_ID, direction: "sell", ...request }),
  };
}
