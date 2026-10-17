import { productLookupInputSchema } from "@/lib/public-data-schema";
import { lookupPublicProduct } from "@/lib/server/public-data";

const headers = { "Cache-Control": "no-store" };

/** Validate identifiers before bounded, read-only requests to fixed public origins. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Enter a product barcode." },
      { status: 400, headers },
    );
  }
  const parsed = productLookupInputSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Enter a valid 8, 12, 13 or 14-digit product barcode." },
      { status: 400, headers },
    );
  try {
    const result = await lookupPublicProduct(parsed.data.barcode);
    return Response.json(result, {
      headers,
      status:
        result.product_status === "unavailable" &&
        result.price_status === "unavailable"
          ? 503
          : 200,
    });
  } catch {
    return Response.json(
      { error: "Public sources could not be loaded. Please retry shortly." },
      { status: 503, headers },
    );
  }
}
