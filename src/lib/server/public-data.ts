import "server-only";
import { z } from "zod";
import {
  productLookupSchema,
  type ProductLookup,
} from "@/lib/public-data-schema";

const headers = {
  "User-Agent": "SalesEasy/1.0 (https://github.com/raj921/sales-easy-copilot)",
  Accept: "application/json",
};
const text = z.string().max(1000).nullish();
const productResponse = z.object({
  status: z.literal("success"),
  product: z.object({
    code: z.string(),
    product_name: text,
    brands: text,
    quantity: text,
    countries_tags: z.array(z.string().max(120)).max(300).optional(),
    last_modified_t: z.number().finite().positive().optional(),
  }),
});
const priceResponse = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        product_code: z.string(),
        price: z.number().finite().nonnegative(),
        currency: z.string().regex(/^[A-Z]{3}$/),
        date: z.iso.date(),
        price_is_discounted: z.boolean(),
        location: z
          .object({
            osm_name: text,
            osm_address_city: text,
            osm_address_country: text,
          })
          .nullish(),
        product: z.object({ quantity: text }).nullish(),
        proof: z.object({ type: text }).nullish(),
      }),
    )
    .max(8),
});

async function readPublicJson(
  url: URL,
  missingAllowed = false,
): Promise<unknown> {
  const response = await fetch(url, {
    headers,
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(8000),
  });
  if (missingAllowed && response.status === 404) return null;
  if (!response.ok) throw new Error("Public source unavailable");
  return response.json();
}
const clean = (value: string | null | undefined) => value?.trim() || null;

/** Independent source reads can fail independently. Never turn a source record into stock. */
export async function lookupPublicProduct(
  barcode: string,
): Promise<ProductLookup> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const productUrl = new URL(
    `https://world.openfoodfacts.org/api/v3.6/product/${barcode}.json`,
  );
  productUrl.searchParams.set(
    "fields",
    "code,product_name,brands,quantity,countries_tags,last_modified_t",
  );
  const pricesUrl = new URL("https://prices.openfoodfacts.org/api/v1/prices");
  pricesUrl.searchParams.set("product_code", barcode);
  pricesUrl.searchParams.set("date__lte", today);
  pricesUrl.searchParams.set("order_by", "-date");
  pricesUrl.searchParams.set("size", "8");

  const [catalog, observations] = await Promise.allSettled([
    readPublicJson(productUrl, true).then((value) =>
      value === null ? null : productResponse.parse(value).product,
    ),
    readPublicJson(pricesUrl).then((value) => priceResponse.parse(value).items),
  ]);
  let product: ProductLookup["product"] = null;
  let productStatus: ProductLookup["product_status"] = "unavailable";
  if (catalog.status === "fulfilled") {
    if (catalog.value === null) productStatus = "not_found";
    else if (catalog.value.code === barcode) {
      const record = catalog.value;
      productStatus = "found";
      const modified = record.last_modified_t
        ? new Date(record.last_modified_t * 1000)
        : null;
      product = {
        name: clean(record.product_name),
        brands: clean(record.brands),
        quantity: clean(record.quantity),
        countries: (record.countries_tags ?? []).map((country) =>
          country.replace(/^[a-z]{2}:/, "").replaceAll("-", " "),
        ),
        modified_at:
          modified && Number.isFinite(modified.getTime())
            ? modified.toISOString()
            : null,
        source_url: `https://world.openfoodfacts.org/product/${barcode}`,
      };
    }
  }
  const prices: ProductLookup["prices"] =
    observations.status === "fulfilled"
      ? observations.value
          .filter((item) => item.product_code === barcode && item.date <= today)
          .map((item) => ({
            id: item.id,
            amount: item.price,
            currency: item.currency,
            observed_on: item.date,
            store: clean(item.location?.osm_name),
            city: clean(item.location?.osm_address_city),
            country: clean(item.location?.osm_address_country),
            discounted: item.price_is_discounted,
            pack_size: clean(item.product?.quantity),
            proof_type: clean(item.proof?.type),
            source_url: `https://prices.openfoodfacts.org/api/v1/prices/${item.id}`,
          }))
      : [];
  return productLookupSchema.parse({
    barcode,
    fetched_at: now.toISOString(),
    product_status: productStatus,
    product,
    price_status:
      observations.status === "rejected"
        ? "unavailable"
        : prices.length
          ? "available"
          : "none",
    prices,
  });
}
