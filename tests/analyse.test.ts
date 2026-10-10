import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInventoryContext } from "@/lib/triage/policy";
import { modelAssessmentSchema } from "@/lib/schemas";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/server/deepseek", () => ({ requestStructuredJson: request }));
import { analyseUpdate } from "@/lib/server/analyse";
const update =
  "Metro Fresh reports Cola 500ml is out of stock. The backroom is locked.";
const fixture = {
  extraction: {
    outlet: "Metro Fresh",
    sku: "Cola 500ml",
    quotes: {
      stockout: "Cola 500ml is out of stock",
      sales_impact: null,
      pricing: null,
      damage: null,
      illness: null,
      prompt_injection: null,
      other: "The backroom is locked",
    },
  },
  assessment: {
    issue_category: "stock_discrepancy",
    urgency: "high",
    evidence: [
      getInventoryContext(update).verified_evidence,
      {
        source: "field_update",
        status: "unverified",
        detail: "Cola 500ml is out of stock",
      },
      {
        source: "field_update",
        status: "unverified",
        detail: "The backroom is locked",
      },
    ],
    recommended_next_action:
      "Ask the duty manager to unlock the backroom and count Cola packs before reconciling the record.",
    missing_information: ["Backroom access and physical count"],
    needs_human_review: true,
    review_reason:
      "The stockout claim conflicts with the record, and locked storage prevents a count.",
  },
};
beforeEach(() => request.mockReset());
describe("one-call model assessment pipeline", () => {
  it("sends the report and matched stock context, retaining the model's seven-field JSON", async () => {
    request.mockResolvedValue(modelAssessmentSchema.parse(fixture));
    expect(await analyseUpdate(update)).toEqual(fixture.assessment);
    expect(request).toHaveBeenCalledTimes(1);
    const input = JSON.parse(request.mock.calls[0][0].userContent);
    expect(input.field_update).toBe(update);
    expect(input.inventory_context.record).toEqual({
      outlet: "Metro Fresh",
      sku: "Cola 500ml",
      system_stock: 48,
    });
    expect(request.mock.calls[0][0].schema).toBe(modelAssessmentSchema);
  });
  it("rejects unsafe output instead of displaying it as successful tailored advice", async () => {
    request.mockResolvedValue(
      modelAssessmentSchema.parse({
        ...fixture,
        assessment: {
          ...fixture.assessment,
          needs_human_review: false,
          review_reason: null,
        },
      }),
    );
    await expect(analyseUpdate(update)).rejects.toMatchObject({
      code: "INVALID_MODEL_RESPONSE",
      status: 502,
    });
  });
});
