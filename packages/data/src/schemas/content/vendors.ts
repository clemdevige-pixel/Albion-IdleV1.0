import { z } from "zod";
import { defineDataCategory } from "../../category.js";
import { asDataId } from "../../data-id.js";
import type { DataReference } from "../../category.js";

const VendorRoleSchema = z.enum(["buy_only", "sell_only", "buy_and_sell", "service_only"]);

const VendorTypeSchema = z.enum([
  "equipment", "resources", "buildings", "workers", "general_goods",
]);

const VendorOfferSchema = z
  .object({
    itemId: z.string(),
    buyPrice: z.number().int().min(1).nullable(),
    sellPrice: z.number().int().min(1).nullable(),
    maxPerTransaction: z.number().int().min(1).nullable(),
    enabled: z.boolean(),
  })
  .superRefine((offer, ctx) => {
    if (offer.buyPrice === null && offer.sellPrice === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `offer "${offer.itemId}" must define at least one price`,
      });
    }
    // 36_VENDOR_SYSTEM "Anti-Arbitrage Rule": sell < buy when both exist.
    if (offer.buyPrice !== null && offer.sellPrice !== null && offer.sellPrice >= offer.buyPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `offer "${offer.itemId}" violates the anti-arbitrage rule (sellPrice >= buyPrice)`,
      });
    }
  });

export const VendorDefinitionSchema = z
  .object({
    id: z.string(),
    enabled: z.boolean(),
    vendorType: VendorTypeSchema,
    role: VendorRoleSchema,
    acceptedCurrency: z.string(),
    offers: z.array(VendorOfferSchema),
    tags: z.array(z.string()),
  })
  .superRefine((vendor, ctx) => {
    const seen = new Set<string>();
    for (const offer of vendor.offers) {
      if (seen.has(offer.itemId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate offer for item "${offer.itemId}"`,
        });
      }
      seen.add(offer.itemId);
    }
    if (vendor.role === "service_only" && vendor.offers.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "service_only vendors must not define offers",
      });
    }
  });

export type VendorDefinition = z.infer<typeof VendorDefinitionSchema>;
export type VendorOffer = z.infer<typeof VendorOfferSchema>;

export const vendorCategory = defineDataCategory({
  category: "vendors" as const,
  schema: VendorDefinitionSchema,
  version: 1,
  getId: (r) => asDataId(r.id),
  getReferences: (r) => {
    const refs: DataReference[] = [
      { targetCategory: "currencies", targetId: r.acceptedCurrency },
    ];
    for (const offer of r.offers) {
      refs.push({ targetCategory: "items", targetId: offer.itemId });
    }
    return refs;
  },
});
