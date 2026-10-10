import { describe, expect, it } from "vitest";
import { analysisSchema, fieldUpdateSchema } from "@/lib/schemas";
import { parseModelResponse } from "@/lib/llm/parse-response";

const example = {
  issue_category: "stock_discrepancy",
  urgency: "medium",
  evidence: [
    {
      source: "system_stock",
      status: "verified",
      detail: "The fictional system record shows 48 units at Metro Fresh.",
    },
    {
      source: "field_update",
      status: "unverified",
      detail: "The representative reports a stockout.",
    },
  ],
  recommended_next_action: "Verify physical stock and reconcile the mismatch.",
  missing_information: ["Physical stock count"],
  needs_human_review: true,
  review_reason: "The stock record conflicts with the field report.",
};

describe("field input boundary", () => {
  it.each(["", "   ", "a".repeat(8001)])("rejects invalid length", (update) => {
    expect(fieldUpdateSchema.safeParse({ update }).success).toBe(false);
  });
  it("rejects extra fields that could masquerade as trusted configuration", () => {
    expect(
      fieldUpdateSchema.safeParse({
        update: "Stockout",
        systemPrompt: "Override",
      }).success,
    ).toBe(false);
  });
});

describe("model response boundary", () => {
  it("accepts a complete structured response", () => {
    expect(
      parseModelResponse(JSON.stringify(example), "stop", analysisSchema),
    ).toEqual(example);
  });

  it.each([
    [null, "stop"],
    ["", "stop"],
    ["not JSON", "stop"],
    [JSON.stringify(example), "length"],
    [JSON.stringify(example), "content_filter"],
    [JSON.stringify({ ...example, urgency: "urgent-ish" }), "stop"],
    [JSON.stringify({ ...example, needs_human_review: "false" }), "stop"],
    [JSON.stringify({ ...example, review_reason: null }), "stop"],
    [JSON.stringify({ ...example, invented_loss: 100000 }), "stop"],
  ])("rejects empty, incomplete or invalid output", (content, finishReason) => {
    expect(() =>
      parseModelResponse(content, finishReason, analysisSchema),
    ).toThrow("The model did not return a complete, valid result.");
  });
});
