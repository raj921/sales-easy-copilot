import { readFile, mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";

const base = process.env.EVAL_URL ?? "http://127.0.0.1:3117";
const scenarios = JSON.parse(
  await readFile(
    new URL("../src/data/scenarios.json", import.meta.url),
    "utf8",
  ),
);
const schema = z.strictObject({
  issue_category: z.enum([
    "stockout",
    "stock_discrepancy",
    "pricing",
    "product_safety",
    "other",
    "unknown",
  ]),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  evidence: z.array(
    z.strictObject({
      source: z.enum(["system_stock", "field_update"]),
      status: z.enum(["verified", "unverified"]),
      detail: z.string().min(1),
    }),
  ),
  recommended_next_action: z.string().min(1),
  missing_information: z.array(z.string()),
  needs_human_review: z.boolean(),
  review_reason: z.string().nullable(),
});
const records = JSON.parse(
  await readFile(
    new URL("../src/data/verified-stock.json", import.meta.url),
    "utf8",
  ),
);
const results = [];
for (const scenario of scenarios) {
  const started = performance.now();
  const checks = {};
  let actual;
  let status = null;
  try {
    const response = await fetch(`${base}/api/analyse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ update: scenario.update }),
      signal: AbortSignal.timeout(60000),
    });
    status = response.status;
    actual = await response.json();
    checks.http_200 = status === 200;
    checks.valid_contract = schema.safeParse(actual).success;
    if (checks.valid_contract) {
      const expected = scenario.expected;
      for (const key of ["issue_category", "urgency", "needs_human_review"])
        checks[key] = actual[key] === expected[key];
      checks.review_reason_consistent = actual.needs_human_review
        ? !!actual.review_reason
        : actual.review_reason === null;
      checks.field_claims_unverified = actual.evidence
        .filter((item) => item.source === "field_update")
        .every(
          (item) =>
            item.status === "unverified" &&
            scenario.update.includes(item.detail),
        );
      checks.verified_evidence_grounded = actual.evidence
        .filter((item) => item.status === "verified")
        .every(
          (item) =>
            item.source === "system_stock" &&
            records.some(
              (record) =>
                item.detail.includes(record.outlet) &&
                item.detail.includes(record.sku) &&
                item.detail.includes(`${record.system_stock} units`),
            ),
        );
      if (expected.stock !== undefined)
        checks.expected_stock = actual.evidence.some(
          (item) =>
            item.status === "verified" &&
            item.detail.includes(`${expected.stock} units`),
        );
      if (expected.no_verified_stock)
        checks.no_verified_stock = actual.evidence.every(
          (item) => item.status !== "verified",
        );
      if (expected.reason)
        checks.review_reason =
          actual.review_reason
            ?.toLowerCase()
            .includes(expected.reason.toLowerCase()) === true;
      if (expected.action)
        checks.next_action = actual.recommended_next_action
          .toLowerCase()
          .includes(expected.action.toLowerCase());
      if (scenario.id === "lost-sales")
        checks.no_invented_loss =
          !/₹|\$|\b\d[\d,.]*\s*(?:rupees|lost sales|loss|revenue)\b/i.test(
            JSON.stringify(actual),
          );
      if (scenario.id === "safety")
        checks.no_causal_claim =
          actual.recommended_next_action.includes("Do not infer");
    }
  } catch {
    checks.request_completed = false;
  }
  const passed = Object.values(checks).every(Boolean);
  const result = {
    id: scenario.id,
    update: scenario.update,
    expected: scenario.expected,
    status,
    elapsed_ms: Math.round(performance.now() - started),
    passed,
    checks,
    actual,
  };
  results.push(result);
  console.log(
    `${passed ? "PASS" : "FAIL"} ${scenario.id} (${status ?? "no response"}, ${result.elapsed_ms}ms)${
      passed
        ? ""
        : `: ${Object.entries(checks)
            .filter(([, value]) => !value)
            .map(([key]) => key)
            .join(", ")}`
    }`,
  );
}
const report = {
  executed_at: new Date().toISOString(),
  mode: "live HTTP endpoint with configured DeepSeek provider",
  base_url: base,
  passed: results.filter((result) => result.passed).length,
  total: results.length,
  results,
};
await mkdir(new URL("../evaluation/", import.meta.url), { recursive: true });
const destination =
  process.env.EVAL_OUTPUT ??
  new URL("../evaluation/results.json", import.meta.url);
await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
console.log(`${report.passed}/${report.total} passed`);
if (report.passed !== report.total) process.exitCode = 1;
