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
    sell: (request) => execute({ direction: "sell", ...request }),
  };
}
