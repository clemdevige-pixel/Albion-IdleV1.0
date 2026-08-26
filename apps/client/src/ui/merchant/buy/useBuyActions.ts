import { GENERAL_VENDOR_ID } from "@game/data";
import { useVendorTransactionExecutor } from "../shared/useVendorTransactionExecutor";

interface BuyRequest {
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly incomeRate: number;
}

export function useBuyActions(): { readonly buy: (request: BuyRequest) => boolean } {
  const execute = useVendorTransactionExecutor();
  return {
    buy: (request) => execute({ vendorId: GENERAL_VENDOR_ID, direction: "buy", ...request }),
  };
}
