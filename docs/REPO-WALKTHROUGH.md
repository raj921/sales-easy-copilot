# Follow one report through SalesEasy

Read this in small chunks. Start with the request and input check, then follow the same report through each function. The app has one pipeline, one assessment provider, and a local fictional inventory fixture.

## 1. The request starts in the browser

Example: **“Metro Fresh reports a stockout of Cola 500ml.”** The fictional inventory says 48 units. The app should ask someone to reconcile that conflict.

[`src/app/page.tsx`](../src/app/page.tsx) renders the `Copilot` workspace. Its navigation switches between field reports, public product lookup, and the fictional inventory table. [`src/components/copilot.tsx`](../src/components/copilot.tsx) runs in the browser because it starts with `"use client"`. Its `submitReport()` function sends:

```json
{ "update": "Metro Fresh reports a stockout of Cola 500ml." }
```

The browser sends this body to `POST /api/analyse`. Its relative URL reaches the same Next.js application. The browser never receives the DeepSeek key.

## 2. The route validates the input

Open [`src/app/api/analyse/route.ts`](../src/app/api/analyse/route.ts). Next.js maps this folder to `/api/analyse`; the exported `POST()` function handles POST requests.

`request.json()` parses the body. `fieldUpdateSchema.safeParse(body)` then checks the contract in [`src/lib/schemas.ts`](../src/lib/schemas.ts). It accepts only `update`, requires a string, trims whitespace, and allows 1–8,000 characters. Parsing and validation are separate: valid JSON can still have the wrong fields or types.

Invalid input returns HTTP 400 before any paid model call. Valid input goes to `analyseUpdate(parsed.data.update)`.

Checkpoint: What happens to `{ "update": "   " }`? It becomes an empty string and fails validation.

## 3. Match inventory and request a tailored assessment

Open [`src/lib/server/analyse.ts`](../src/lib/server/analyse.ts). `analyseUpdate()` first calls `getInventoryContext()` from [`src/lib/triage/policy.ts`](../src/lib/triage/policy.ts). It matches one explicitly mentioned outlet/SKU pair against the fictional inventory. Unknown or ambiguous reports receive no verified stock record.

The request to DeepSeek contains both sources:

```json
{
  "field_update": "Metro Fresh reports a stockout of Cola 500ml.",
  "inventory_context": {
    "record": { "outlet": "Metro Fresh", "sku": "Cola 500ml", "system_stock": 48 },
    "ambiguous": false,
    "verified_evidence": {
      "source": "system_stock",
      "status": "verified",
      "detail": "Metro Fresh: Cola 500ml, 48 units in the supplied fictional system record. This does not verify current shelf availability."
    }
  }
}
```

`requestStructuredJson()` receives the assessment prompt and `modelAssessmentSchema`. The model returns an internal envelope with two parts:

- `extraction`: outlet, SKU, and exact quotes for reported issues.
- `assessment`: the full seven-field proposed result.

The prompt treats the report as untrusted data. It asks for an action, review explanation, and missing information tailored to that report. Missing extraction slots use `null`. Reported claims remain unverified.

For a report about a recent delivery and locked storage, the action can mention the duty manager and backroom access. A delivery-delay report can instead discuss truck arrival times and the unloading gate. These are model-written recommendations.

## 4. The SDK makes the network call

Open [`src/lib/server/deepseek.ts`](../src/lib/server/deepseek.ts). The OpenAI-compatible SDK points at `https://api.deepseek.com` and sends a chat-completion request. `getDeepSeekEnv()` in [`src/lib/server/env.ts`](../src/lib/server/env.ts) validates the server configuration.

The request contains a system prompt, the untrusted update, matched inventory context, and a JSON schema. It uses JSON object mode, reasoning disabled, temperature zero, and a maximum of 4,096 output tokens. Temperature zero does not guarantee identical answers.

The defaults allow one SDK retry and 15 seconds per attempt. A separate 45-second abort signal bounds the overall request. There is one logical assessment call; retries may send additional network requests.

`server-only` prevents these modules from being imported into browser code. Locally the key lives in ignored `.env.local`; on Vercel it lives in a server environment variable.

## 5. Validate structure, then validate evidence

[`src/lib/llm/parse-response.ts`](../src/lib/llm/parse-response.ts) requires a completed response, nonempty content, parseable JSON, and the strict internal envelope schema. JSON object mode helps the provider produce JSON; Zod checks whether that JSON has the required structure.

Next, `validateGrounding()` in [`src/lib/triage/policy.ts`](../src/lib/triage/policy.ts) checks that every quote appears verbatim in the original update. Outlet and SKU must also appear after normalization. Fabricated evidence produces a 502 fallback.

These checks answer different questions:

| Check | What it proves |
| --- | --- |
| JSON parsing | The response is valid JSON. |
| Zod schema | Its fields and types match the contract. |
| Quote grounding | The text occurs in the report. |
| Inventory comparison | A supplied record supports a stock fact. |

Grounding does not prove that a representative's claim is true or correctly classified.

## 6. Check the proposed decision without replacing its prose

`validateAssessment()` checks the envelope after structure validation. Field evidence must be exact report text and remain unverified. Stock evidence must exactly match the server-supplied record. Every extracted quote must appear in the evidence list.

For Metro Fresh and Cola 500ml, a stockout quote and 48 recorded units require `stock_discrepancy`, at least `high` urgency, and human review. A model proposal that marks this conflict low urgency or skips review is rejected.

Safety takes priority. Recognized illness requires critical urgency. Product safety requires high urgency or above, escalation, containment, and human review. Claimed sales impact requires review even when stock is zero. Pricing recommendations require approval. Unknown records and unfamiliar operational issues require review.

The number check rejects numeric tokens absent from the report or supplied stock evidence. It does not prove that a supported number has the correct meaning. Safety and approval checks also use English text patterns. These checks cannot guarantee complete semantic correctness.

When checks pass, the function returns the model's assessment. It preserves `recommended_next_action`, `review_reason`, and `missing_information`. Successful recommendations no longer come from backend templates.

The final `analysisSchema.parse()` checks all seven fields. Human review requires a reason. No review requires a null reason. Review is advisory: the app does not notify a person or implement an approval queue.

## 7. The response returns to the browser

The route returns HTTP 200 with the assessment and `Cache-Control: no-store`. The browser validates the body with the same `analysisSchema` before rendering evidence, urgency, review status, missing information, and the JSON tab.

If the model is unavailable, the route catches `AppError` and calls `failureAnalysis()`. The fallback keeps the seven-field contract and requires human review. Clear safety reports retain safety escalation even when the provider fails.

| HTTP status | Meaning | Browser behavior |
| --- | --- | --- |
| 200 | Valid assessment | Displays the result. |
| 400 | Invalid input | Displays an input error. |
| 502 | Invalid model output or evidence | Displays a labelled review fallback. |
| 503 | Missing configuration or unavailable provider | Displays a labelled review fallback. |
| 504 | Provider timeout | Displays a labelled review fallback. |

`POST /api/deepseek` re-exports the same handler. It is an alias, not a second pipeline. `GET /api/health` checks that the app responds; it does not test DeepSeek.

## 8. Tests explain what reliability means here

Start with [`tests/contracts.test.ts`](../tests/contracts.test.ts) for valid and invalid input/output. Read [`tests/policy.test.ts`](../tests/policy.test.ts) for assessment validation and the saved lost-sales regression. [`tests/deepseek.test.ts`](../tests/deepseek.test.ts) mocks provider completion and failures. [`tests/routes.test.ts`](../tests/routes.test.ts) checks HTTP behavior. These tests make no paid calls.

[`src/data/scenarios.json`](../src/data/scenarios.json) contains the five required scenarios and three extra scenarios. [`scripts/evaluate.mjs`](../scripts/evaluate.mjs) submits them over real HTTP and checks expected versus actual results. It also submits the two cases in `src/data/dynamic-scenarios.json`, for ten logical paid provider calls. Run it only against your intended endpoint:

```sh
EVAL_URL=https://YOUR-DEMO.vercel.app EVAL_OUTPUT=evaluation/deployed-dynamic-results.json npm run eval
```

Read [`EVALUATION.md`](../EVALUATION.md) for measured results and the failure/fix. A small passing evaluation is evidence for those cases, not a guarantee for arbitrary reports.

## 9. GitHub and Vercel serve different purposes

GitHub holds source, documentation, diagrams, sample inputs, and evaluation results. Git commits record versions. The key and generated build output stay outside Git.

Vercel installs dependencies, builds Next.js, serves the homepage, and runs the route handlers as server functions. The external network call still goes from the server to DeepSeek. There is no database or separate backend host.

When connected through Vercel's Git integration, pushes to `main` trigger production deployments and other branches receive preview deployments. A deployment builds a specific source version; editing files locally does not change the public app until that version is deployed.

After a change, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Commit and push the intended files. Check the public homepage, `/api/health`, and one real analysis after deployment. See the README for the actual repository and demo links.

## A useful next learning exercise

Trace this report without running it: **“City Corner reports a damaged Juice 1L pack and a customer feeling unwell.”** Find the safety checks in `validateAssessment()`. Explain why stock of 12 units does not reduce the safety urgency. Then submit that sample in the demo and compare your prediction with the result.

## 10. Follow a public barcode separately

`src/components/product-lookup.tsx` submits `{barcode}` to `src/app/api/products/lookup/route.ts`. `src/lib/public-data-schema.ts` checks the identifier and response contracts. `src/lib/server/public-data.ts` reads Open Food Facts product metadata and Open Prices observations independently from fixed origins. Each request has an eight-second timeout and a 15-minute source-cache policy. Partial results remain usable. Dates, source links, currency and location stay visible. No stock is inferred and no lookup content is sent to DeepSeek.

`src/components/assessment-panel.tsx` presents the seven-field result, evidence, JSON, copy/download controls and personal checklist. `src/components/copilot.tsx` keeps six assessments in component memory. `src/lib/preferences.ts` validates the only local-storage content: appearance, density and preferred result tab. Reloading clears reports, not preferences. `tests/public-data.test.ts` checks barcode validation, source failures, provenance, filtering and preference defaults without external calls.
