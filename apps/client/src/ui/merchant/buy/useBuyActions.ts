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
    buy: (request) => execute({ direction: "buy", ...request }),
  };
}
