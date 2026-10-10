import { AppError } from "@/lib/errors";
import { fieldUpdateSchema } from "@/lib/schemas";
import { analyseUpdate } from "@/lib/server/analyse";
import { failureAnalysis } from "@/lib/triage/policy";

const headers = { "Cache-Control": "no-store" };

/** Validate the request before making a paid provider call. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "The request body must contain valid JSON." },
      { status: 400, headers },
    );
  }
  const parsed = fieldUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid field update.",
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
      },
      { status: 400, headers },
    );
  }
  try {
    return Response.json(await analyseUpdate(parsed.data.update), { headers });
  } catch (error) {
    const failure =
      error instanceof AppError
        ? error
        : new AppError(
            "INVALID_MODEL_RESPONSE",
            "The assessment could not be validated. Request human review.",
            502,
          );
    return Response.json(failureAnalysis(parsed.data.update, failure), {
      status: failure.status,
      headers: { ...headers, "X-Analysis-Error": failure.code },
    });
  }
}
