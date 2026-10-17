import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isValidBarcode,
  productLookupInputSchema,
  productLookupSchema,
} from "@/lib/public-data-schema";
import { lookupPublicProduct } from "@/lib/server/public-data";
import { POST } from "@/app/api/products/lookup/route";
import { parsePreferences, defaultPreferences } from "@/lib/preferences";

const barcode = "5449000000996";
const product = {
  status: "success",
  product: {
    code: barcode,
    product_name: "Coca-Cola Original",
    brands: "Coca-Cola",
    quantity: "330 ml",
    countries_tags: ["en:spain"],
    last_modified_t: 1792055651,
  },
};
const observation = {
  id: 262672,
  product_code: barcode,
  price: 1.1,
  currency: "EUR",
  date: "2026-04-06",
  price_is_discounted: false,
  product: { quantity: "330 ml" },
  location: {
    osm_name: "Public example store",
    osm_address_city: "Los Cristianos",
    osm_address_country: "España",
  },
  proof: { type: "PRICE_TAG" },
};
const prices = { items: [observation] };
const fetchMock = vi.fn();
function mockSources(
  catalog: unknown = product,
  priceRecords: unknown = prices,
) {
  fetchMock.mockImplementation(async (url: URL) =>
    Response.json(
      url.hostname === "world.openfoodfacts.org" ? catalog : priceRecords,
    ),
  );
}
const request = (body: string) =>
  new Request("http://localhost/api/products/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  mockSources();
});
afterEach(() => vi.unstubAllGlobals());

describe("barcode validation before public requests", () => {
  it.each([barcode, "3017620422003", "96385074", "036000291452"])(
    "accepts valid check digits for %s",
    (value) => expect(isValidBarcode(value)).toBe(true),
  );
  it.each([
    "5449000000995",
    "00000000",
    "1234",
    "https://internal.example/secret",
  ])(
    "rejects invalid identifiers before making any network request: %s",
    async (value) => {
      const response = await POST(request(JSON.stringify({ barcode: value })));
      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("normalizes readable barcode spacing without changing the identifier", () =>
    expect(
      productLookupInputSchema.parse({ barcode: "5449 0000 0099-6" }).barcode,
    ).toBe(barcode));
  it("rejects malformed and extra-field request bodies", async () => {
    for (const body of [
      "{",
      JSON.stringify({ barcode, url: "http://private.example" }),
    ])
      expect((await POST(request(body))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("public source boundaries", () => {
  it("returns source dates, pack size and unchanged observed price without inventing stock", async () => {
    const result = await lookupPublicProduct(barcode);
    expect(productLookupSchema.safeParse(result).success).toBe(true);
    expect(result.product).toMatchObject({
      name: "Coca-Cola Original",
      quantity: "330 ml",
    });
    expect(result.prices[0]).toMatchObject({
      amount: 1.1,
      currency: "EUR",
      observed_on: "2026-04-06",
      pack_size: "330 ml",
    });
    expect(result).not.toHaveProperty("system_stock");
    expect(result).not.toHaveProperty("needs_human_review");
    expect(result.prices[0].source_url).toContain("262672");
  });
  it("preserves product data when the price provider is unavailable", async () => {
    fetchMock.mockImplementation(async (url: URL) =>
      url.hostname === "world.openfoodfacts.org"
        ? Response.json(product)
        : new Response("private upstream error", { status: 429 }),
    );
    const result = await lookupPublicProduct(barcode);
    expect(result.product_status).toBe("found");
    expect(result.price_status).toBe("unavailable");
    expect(result.prices).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("private upstream");
  });
  it("preserves barcode-linked prices when the product provider is unavailable", async () => {
    fetchMock.mockImplementation(async (url: URL) =>
      url.hostname === "world.openfoodfacts.org"
        ? new Response("unavailable", { status: 503 })
        : Response.json(prices),
    );
    const result = await lookupPublicProduct(barcode);
    expect(result.product_status).toBe("unavailable");
    expect(result.product).toBeNull();
    expect(result.price_status).toBe("available");
  });
  it("distinguishes a missing catalogue product from an unavailable provider", async () => {
    fetchMock.mockImplementation(async (url: URL) =>
      url.hostname === "world.openfoodfacts.org"
        ? new Response("not found", { status: 404 })
        : Response.json({ items: [] }),
    );
    const result = await lookupPublicProduct(barcode);
    expect(result.product_status).toBe("not_found");
    expect(result.price_status).toBe("none");
  });
  it("rejects a different catalogue barcode instead of silently attaching another product", async () => {
    mockSources({
      ...product,
      product: { ...product.product, code: "3017620422003" },
    });
    expect((await lookupPublicProduct(barcode)).product_status).toBe(
      "unavailable",
    );
  });
  it("omits different-product and future price records", async () => {
    mockSources(product, {
      items: [
        observation,
        { ...observation, id: 2, product_code: "3017620422003" },
        { ...observation, id: 3, date: "2999-01-01" },
      ],
    });
    expect((await lookupPublicProduct(barcode)).prices).toHaveLength(1);
  });
  it("labels malformed source data as unavailable", async () => {
    mockSources(product, { items: [{ ...observation, price: -10 }] });
    expect((await lookupPublicProduct(barcode)).price_status).toBe(
      "unavailable",
    );
  });
  it("returns a safe 503 response when both public sources fail", async () => {
    fetchMock.mockRejectedValue(new Error("private network details"));
    const response = await POST(request(JSON.stringify({ barcode })));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(productLookupSchema.safeParse(body).success).toBe(true);
    expect(body.product_status).toBe("unavailable");
    expect(body.price_status).toBe("unavailable");
    expect(JSON.stringify(body)).not.toContain("private network");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("display preferences", () => {
  it("uses safe defaults for malformed browser preferences", () => {
    for (const value of [null, "{", JSON.stringify({ theme: "unknown" })])
      expect(parsePreferences(value)).toEqual(defaultPreferences);
  });
  it("retains supported display preferences only", () => {
    const prefs = { theme: "dark", density: "compact", resultView: "json" };
    expect(parsePreferences(JSON.stringify(prefs))).toEqual(prefs);
  });
});
