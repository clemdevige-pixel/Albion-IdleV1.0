export const BANK_MAX_TABS = 5;

export const BANK_EXTENSION_PURCHASES = [
  { tabNumber: 3, silverCost: 100_000 },
  { tabNumber: 4, silverCost: 300_000 },
  { tabNumber: 5, silverCost: 750_000 },
] as const;

export type BankExtensionTabNumber = (typeof BANK_EXTENSION_PURCHASES)[number]["tabNumber"];

export function getBankExtensionPurchase(tabNumber: number) {
  return BANK_EXTENSION_PURCHASES.find((purchase) => purchase.tabNumber === tabNumber);
}
