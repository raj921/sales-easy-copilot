import { z } from "zod";

/** GS1 check digit for GTIN-8, UPC-A, EAN-13 and GTIN-14 identifiers. */
export function isValidBarcode(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value))
    return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  const sum = digits
    .reverse()
    .reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return (10 - (sum % 10)) % 10 === check;
}

export const productLookupInputSchema = z.strictObject({
  barcode: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .refine(
      isValidBarcode,
      "Enter a valid 8, 12, 13 or 14-digit product barcode.",
    ),
});

const date = z.iso.date();
export const productLookupSchema = z.strictObject({
  barcode: z.string(),
  fetched_at: z.iso.datetime(),
  product_status: z.enum(["found", "not_found", "unavailable"]),
  product: z
    .strictObject({
      name: z.string().nullable(),
      brands: z.string().nullable(),
      quantity: z.string().nullable(),
      countries: z.array(z.string()),
      modified_at: z.iso.datetime().nullable(),
      source_url: z.url(),
    })
    .nullable(),
  price_status: z.enum(["available", "none", "unavailable"]),
  prices: z
    .array(
      z.strictObject({
        id: z.number().int().positive(),
        amount: z.number().nonnegative(),
        currency: z.string().regex(/^[A-Z]{3}$/),
        observed_on: date,
        store: z.string().nullable(),
        city: z.string().nullable(),
        country: z.string().nullable(),
        discounted: z.boolean(),
        pack_size: z.string().nullable(),
        proof_type: z.string().nullable(),
        source_url: z.url(),
      }),
    )
    .max(8),
});
export type ProductLookup = z.infer<typeof productLookupSchema>;
