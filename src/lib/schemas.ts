import { z } from "zod";

export const fieldUpdateSchema = z.strictObject({
  update: z
    .string({ error: "Provide an update as text." })
    .trim()
    .min(1, "The update cannot be empty.")
    .max(8000, "Keep the update within 8,000 characters."),
});

export const analysisSchema = z
  .strictObject({
    issue_category: z.enum([
      "stockout",
      "stock_discrepancy",
      "pricing",
      "product_safety",
      "other",
      "unknown",
    ]),
    urgency: z.enum(["low", "medium", "high", "critical"]),
    evidence: z
      .array(
        z.strictObject({
          source: z.enum(["system_stock", "field_update"]),
          status: z.enum(["verified", "unverified"]),
          detail: z.string().trim().min(1).max(2000),
        }),
      )
      .max(20),
    recommended_next_action: z.string().trim().min(1).max(2000),
    missing_information: z.array(z.string().trim().min(1).max(500)).max(20),
    needs_human_review: z.boolean(),
    review_reason: z.string().trim().min(1).max(2000).nullable(),
  })
  .superRefine((value, context) => {
    if (value.needs_human_review && value.review_reason === null) {
      context.addIssue({
        code: "custom",
        path: ["review_reason"],
        message: "Human review requires a reason.",
      });
    }
    if (!value.needs_human_review && value.review_reason !== null) {
      context.addIssue({
        code: "custom",
        path: ["review_reason"],
        message: "Use null when human review is not required.",
      });
    }
  });

export type FieldUpdate = z.infer<typeof fieldUpdateSchema>;
export type Analysis = z.infer<typeof analysisSchema>;

const quote = z.string().min(1).max(2000).nullable();

/** The model extracts claims; backend rules own the final decision. */
export const extractionSchema = z.strictObject({
  outlet: z.string().min(1).max(200).nullable(),
  sku: z.string().min(1).max(200).nullable(),
  quotes: z.strictObject({
    stockout: quote,
    sales_impact: quote,
    pricing: quote,
    damage: quote,
    illness: quote,
    prompt_injection: quote,
    other: quote,
  }),
});

export type Extraction = z.infer<typeof extractionSchema>;
