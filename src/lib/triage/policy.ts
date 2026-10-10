import stock from "@/data/verified-stock.json";
import { AppError } from "@/lib/errors";
import {
  analysisSchema,
  type Analysis,
  type Extraction,
  type ModelAssessment,
} from "@/lib/schemas";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
const injectionPattern =
  /ignore\s+(?:(?:all|previous|prior|the)\s+)*(?:instructions|rules)|(?:system|developer)\s*(?:message|prompt)|mark\s+(?:this\s+)?resolved|override\s+(?:the\s+)?(?:rules|instructions)/i;

/** Reject fabricated quotes or identifiers before treating extraction as evidence. */
export function validateGrounding(update: string, extracted: Extraction): void {
  const normalizedUpdate = normalize(update);
  for (const identifier of [extracted.outlet, extracted.sku]) {
    if (
      identifier &&
      (!normalize(identifier) ||
        !normalizedUpdate.includes(normalize(identifier)))
    ) {
      throw new AppError(
        "INVALID_MODEL_RESPONSE",
        "The model returned evidence that is not present in the update.",
        502,
      );
    }
  }
  for (const quote of Object.values(extracted.quotes)) {
    if (quote !== null && !update.includes(quote)) {
      throw new AppError(
        "INVALID_MODEL_RESPONSE",
        "The model returned evidence that is not present in the update.",
        502,
      );
    }
  }
}

/** Conservative English safety backstop. A report is still an unverified claim. */
export function hasPositiveMention(text: string, pattern: RegExp): boolean {
  for (const clause of text.split(/[.!?;,]|\bbut\b/i)) {
    // An earlier negated incident must not hide a later affirmative incident.
    const mentions = clause.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of mentions) {
      const prefix = clause
        .slice(0, match.index)
        .split(/\s+/)
        .slice(-6)
        .join(" ");
      if (!/\b(no|not|never|without|nobody|none|denies|denied)\b/i.test(prefix))
        return true;
    }
  }
  return false;
}

const illnessPattern =
  /\b(unwell|ill|sick|vomit(?:ing|ed)?|nausea|nauseous|dizzy|dizziness|allergic|poison(?:ing|ed)?|hospitali[sz]ed)\b/i;
const damagePattern =
  /\b(damaged|broken|leaking|contaminated|spoiled|expired)\b/i;

/** Match only one explicitly mentioned outlet/SKU pair before sending model context. */
export function getInventoryContext(update: string) {
  const normalizedUpdate = normalize(update);
  const outlets = [...new Set(stock.map((record) => record.outlet))].filter(
    (outlet) => normalizedUpdate.includes(normalize(outlet)),
  );
  const skus = [...new Set(stock.map((record) => record.sku))].filter((sku) =>
    normalizedUpdate.includes(normalize(sku)),
  );
  const record =
    outlets.length === 1 && skus.length === 1
      ? (stock.find(
          (item) => item.outlet === outlets[0] && item.sku === skus[0],
        ) ?? null)
      : null;
  return {
    record,
    ambiguous: outlets.length > 1 || skus.length > 1,
    verified_evidence: record
      ? {
          source: "system_stock" as const,
          status: "verified" as const,
          detail: `${record.outlet}: ${record.sku}, ${record.system_stock} units in the supplied fictional system record. This does not verify current shelf availability.`,
        }
      : null,
  };
}

function rejectProposal(message: string): never {
  throw new AppError("INVALID_MODEL_RESPONSE", message, 502);
}

const urgencyRank = { low: 0, medium: 1, high: 2, critical: 3 };

/** Retain model-written prose only when its provenance and required decisions pass. */
export function validateAssessment(
  update: string,
  proposal: ModelAssessment,
): Analysis {
  const { extraction, assessment } = proposal;
  validateGrounding(update, extraction);
  const context = getInventoryContext(update);
  const fieldEvidence = assessment.evidence.filter(
    (item) => item.source === "field_update",
  );
  const stockEvidence = assessment.evidence.filter(
    (item) => item.source === "system_stock",
  );
  if (
    !fieldEvidence.length ||
    fieldEvidence.some(
      (item) => item.status !== "unverified" || !update.includes(item.detail),
    )
  ) {
    rejectProposal(
      "The assessment contains missing or unsupported field evidence. Request human review.",
    );
  }
  if (context.verified_evidence) {
    if (
      stockEvidence.length !== 1 ||
      stockEvidence[0].status !== "verified" ||
      stockEvidence[0].detail !== context.verified_evidence.detail
    ) {
      rejectProposal(
        "The assessment does not preserve the supplied stock evidence. Request human review.",
      );
    }
  } else if (stockEvidence.length) {
    rejectProposal(
      "The assessment invented a verified stock record. Request human review.",
    );
  }
  for (const quote of Object.values(extraction.quotes)) {
    if (
      quote !== null &&
      !fieldEvidence.some((item) => item.detail === quote)
    ) {
      rejectProposal(
        "The assessment omitted an extracted observation. Request human review.",
      );
    }
  }

  const { quotes } = extraction;
  const illness =
    hasPositiveMention(update, illnessPattern) ||
    hasPositiveMention(quotes.illness ?? "", illnessPattern);
  const damage =
    hasPositiveMention(update, damagePattern) ||
    hasPositiveMention(quotes.damage ?? "", damagePattern);
  const injection =
    quotes.prompt_injection !== null || injectionPattern.test(update);
  const routine =
    context.record &&
    quotes.other &&
    /\b(everything is fine|no (?:issues|problems|incidents)|routine update|stock (?:is )?available)\b/i.test(
      quotes.other,
    );
  let requiredCategory: Analysis["issue_category"] | null = null;
  let minimumUrgency: Analysis["urgency"] = "low";
  let reviewRequired =
    !context.record ||
    context.ambiguous ||
    injection ||
    quotes.sales_impact !== null ||
    quotes.pricing !== null ||
    assessment.issue_category === "product_safety" ||
    assessment.issue_category === "unknown" ||
    (assessment.issue_category === "other" && !routine);

  if (illness || damage || assessment.issue_category === "product_safety") {
    requiredCategory = "product_safety";
    minimumUrgency = illness ? "critical" : "high";
    reviewRequired = true;
    if (
      !/escalat|notify|contact|alert/i.test(
        assessment.recommended_next_action,
      ) ||
      !/hold|isolat|quarantin|withdraw|remove.+sale/i.test(
        assessment.recommended_next_action,
      )
    ) {
      rejectProposal(
        "The assessment omitted required safety escalation or product containment. Request human review.",
      );
    }
    if (
      illness &&
      !/do not infer|do not assume|cannot (?:confirm|establish)|caus(?:e|ation).{0,30}(?:unconfirmed|not established)/i.test(
        assessment.recommended_next_action,
      )
    ) {
      rejectProposal(
        "The assessment must preserve uncertainty about illness causation. Request human review.",
      );
    }
  } else if (quotes.stockout) {
    requiredCategory =
      context.record && context.record.system_stock > 0
        ? "stock_discrepancy"
        : "stockout";
    minimumUrgency =
      requiredCategory === "stock_discrepancy" ? "high" : "medium";
    reviewRequired ||= requiredCategory === "stock_discrepancy";
  } else if (quotes.pricing) {
    requiredCategory = "pricing";
    minimumUrgency = "medium";
  }
  if (reviewRequired && urgencyRank[minimumUrgency] < urgencyRank.medium)
    minimumUrgency = "medium";
  if (
    (requiredCategory && assessment.issue_category !== requiredCategory) ||
    urgencyRank[assessment.urgency] < urgencyRank[minimumUrgency] ||
    (reviewRequired && !assessment.needs_human_review)
  ) {
    rejectProposal(
      "The assessment conflicts with required safety or human-review rules. Request human review.",
    );
  }
  if (
    (assessment.issue_category === "stockout" ||
      assessment.issue_category === "stock_discrepancy") &&
    !quotes.stockout
  ) {
    rejectProposal(
      "The stock decision lacks a quoted stockout observation. Request human review.",
    );
  }
  if (quotes.pricing || assessment.issue_category === "pricing") {
    if (
      !quotes.pricing ||
      !assessment.needs_human_review ||
      !/approv/i.test(assessment.recommended_next_action) ||
      hasPositiveMention(
        assessment.recommended_next_action,
        /\b(?:apply|match|lower|reduce|change)\b[^.!?;]{0,60}\b(?:now|immediately|without approval)\b|\b(?:immediately|now)\b[^.!?;]{0,30}\b(?:match|lower|reduce|change)\b/i,
      )
    ) {
      rejectProposal(
        "The pricing recommendation requires evidence and approval before action. Request human review.",
      );
    }
  }
  // This rejects new numeric assertions, not every possible semantic hallucination.
  const supportedNumbers = new Set(
    (update + " " + (context.verified_evidence?.detail ?? "")).match(
      /\d+(?:[,.]\d+)*/g,
    ) ?? [],
  );
  const narrative = [
    assessment.recommended_next_action,
    assessment.review_reason ?? "",
    ...assessment.missing_information,
  ].join(" ");
  if (
    (narrative.match(/\d+(?:[,.]\d+)*/g) ?? []).some(
      (number) => !supportedNumbers.has(number),
    )
  ) {
    rejectProposal(
      "The assessment introduced an unsupported numeric assertion. Request human review.",
    );
  }
  return analysisSchema.parse(assessment);
}

/** Preserve the seven-field contract on provider failure without inventing an assessment. */
export function failureAnalysis(update: string, error: AppError): Analysis {
  const safety =
    hasPositiveMention(update, illnessPattern) ||
    hasPositiveMention(update, damagePattern);
  return analysisSchema.parse({
    issue_category: safety ? "product_safety" : "unknown",
    urgency: safety
      ? hasPositiveMention(update, illnessPattern)
        ? "critical"
        : "high"
      : "medium",
    evidence: [
      {
        source: "field_update",
        status: "unverified",
        detail: update.slice(0, 2000),
      },
    ],
    recommended_next_action: safety
      ? "Escalate the original report immediately to the supervisor and quality/safety team. Recommend holding affected products from sale while the incident is assessed. Model analysis was unavailable."
      : "Ask a supervisor to assess the original report. Retry the analysis when the service is available; do not act on an automated recommendation.",
    missing_information: ["A completed, grounded model assessment"],
    needs_human_review: true,
    review_reason: error.message,
  });
}
