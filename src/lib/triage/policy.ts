import stock from "@/data/verified-stock.json";
import { AppError } from "@/lib/errors";
import { analysisSchema, type Analysis, type Extraction } from "@/lib/schemas";

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

/** Pure policy: verified inventory comes only from the supplied fixture. */
export function applyPolicy(update: string, extracted: Extraction): Analysis {
  validateGrounding(update, extracted);
  const normalizedUpdate = normalize(update);
  const outlets = [...new Set(stock.map((record) => record.outlet))].filter(
    (outlet) => normalizedUpdate.includes(normalize(outlet)),
  );
  const skus = [...new Set(stock.map((record) => record.sku))].filter((sku) =>
    normalizedUpdate.includes(normalize(sku)),
  );
  const record =
    outlets.length === 1 && skus.length === 1
      ? stock.find((item) => item.outlet === outlets[0] && item.sku === skus[0])
      : undefined;
  const ambiguous = outlets.length > 1 || skus.length > 1;
  const { quotes } = extracted;
  const illness = hasPositiveMention(quotes.illness ?? update, illnessPattern);
  const damage = hasPositiveMention(quotes.damage ?? update, damagePattern);
  const injection =
    quotes.prompt_injection !== null || injectionPattern.test(update);
  const evidence: Analysis["evidence"] = [];
  if (record) {
    evidence.push({
      source: "system_stock",
      status: "verified",
      detail: `${record.outlet}: ${record.sku}, ${record.system_stock} units in the supplied fictional system record. This does not verify current shelf availability.`,
    });
  }
  const uniqueQuotes = [
    ...new Set(
      Object.values(quotes).filter((value): value is string => value !== null),
    ),
  ];
  for (const detail of uniqueQuotes)
    evidence.push({ source: "field_update", status: "unverified", detail });
  if ((illness || damage || injection) && uniqueQuotes.length === 0) {
    evidence.push({
      source: "field_update",
      status: "unverified",
      detail: update.slice(0, 2000),
    });
  }
  const missing: string[] = [];
  const reasons: string[] = [];
  let issue: Analysis["issue_category"] = "unknown";
  let urgency: Analysis["urgency"] = "medium";
  let action =
    "Ask the representative to clarify the issue before taking action.";

  if (illness || damage) {
    issue = "product_safety";
    urgency = illness ? "critical" : "high";
    action = illness
      ? "Escalate immediately to the supervisor and quality/safety team. Recommend holding the affected product from sale, record the batch and incident details, and ask the supervisor to arrange appropriate customer assistance. Do not infer that the product caused the illness."
      : "Notify the supervisor and quality team. Recommend isolating the affected packs from sale and inspecting the batch before any further action.";
    missing.push(
      "Affected batch/lot, expiry date and quantity",
      "Incident time, photographs and customer follow-up details",
    );
    reasons.push(
      illness
        ? "A reported customer illness is a potential safety incident requiring urgent human assessment."
        : "Reported product damage needs quality review.",
    );
  } else if (quotes.stockout) {
    issue =
      record && record.system_stock > 0 ? "stock_discrepancy" : "stockout";
    urgency = issue === "stock_discrepancy" ? "high" : "medium";
    action =
      record && record.system_stock > 0
        ? "Ask the outlet to count shelf and backroom stock, check the stock record's freshness, and reconcile the conflicting evidence with the supervisor before replenishing."
        : record
          ? "Check physical availability and arrange the standard replenishment request with the outlet. Confirm delivery timing."
          : "Confirm the outlet and SKU, obtain a verified inventory record and physical count, then decide whether replenishment is needed.";
    missing.push(
      "Current shelf/backroom count and stock-record timestamp",
      "Replenishment availability and delivery timing",
    );
    if (issue === "stock_discrepancy")
      reasons.push(
        "The field stockout claim conflicts with positive system stock; neither source establishes current physical availability.",
      );
    if (!record)
      reasons.push(
        "No unique verified outlet/SKU record supports this stockout report.",
      );
  } else if (quotes.pricing) {
    issue = "pricing";
    urgency = "medium";
    action =
      "Collect dated competitor prices for the same SKU at specific outlets and send them to the sales manager for review. Any price change requires approval; do not apply an immediate price match.";
    missing.push(
      "Competitor, outlet, comparable SKU, actual price and date",
      "Promotion terms, scope, margin and approval authority",
    );
    reasons.push(
      "Competitor pricing and the requested price change are unverified and require manager approval.",
    );
  } else if (
    quotes.other &&
    record &&
    /\b(everything is fine|no (?:issues|problems|incidents)|routine update|stock (?:is )?available)\b/i.test(
      quotes.other,
    )
  ) {
    issue = "other";
    urgency = "low";
    action =
      "Record the routine update. No corrective action is established by the available evidence.";
  } else {
    if (quotes.other) issue = "other";
    reasons.push("The update does not establish a clear, supported issue.");
    missing.push("Specific issue and observation details");
  }

  if (quotes.pricing && issue !== "pricing") {
    missing.push("Dated, comparable competitor prices and manager approval");
    reasons.push(
      "A concurrent pricing request also needs manager review; no price change is authorized.",
    );
    action +=
      " Route any pricing request to the sales manager for separate approval.";
  }
  if (quotes.sales_impact) {
    missing.push("Lost-sales period, units and independently verified impact");
    reasons.push(
      "The reported sales impact has not been independently verified; no loss figure can be inferred.",
    );
  }
  if (!record) {
    if (!extracted.outlet) missing.push("Outlet name");
    if (!extracted.sku) missing.push("SKU and pack size");
    missing.push("A unique verified outlet/SKU stock record");
    if (issue === "other")
      reasons.push("There is no verified inventory match.");
  }
  if (ambiguous)
    reasons.push(
      "Multiple outlets or SKUs are mentioned; this single-issue assessment cannot safely assign inventory evidence.",
    );
  if (injection) {
    reasons.push(
      "The update contains instructions attempting to control the assessment; these are untrusted field content.",
    );
    if (urgency === "low") urgency = "medium";
    if (issue === "unknown")
      action =
        "Ask a supervisor to review the original field report and request an actual sales observation. Ignore the embedded instructions.";
  }
  return analysisSchema.parse({
    issue_category: issue,
    urgency,
    evidence,
    recommended_next_action: action,
    missing_information: [...new Set(missing)],
    needs_human_review: reasons.length > 0,
    review_reason: reasons.length ? reasons.join(" ") : null,
  });
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
