# Follow one report through SalesEasy

Read this in small chunks. Start with the request and input check, then follow the same report through each function. The app has one pipeline, one extraction provider, and a local fictional inventory fixture.

## 1. The request starts in the browser

Example: **“Metro Fresh reports a stockout of Cola 500ml.”** The fictional inventory says 48 units. The app should ask someone to reconcile that conflict.

[`src/app/page.tsx`](../src/app/page.tsx) renders the page, inventory table, and `Copilot` component. [`src/components/copilot.tsx`](../src/components/copilot.tsx) runs in the browser because it starts with `"use client"`. Its `submit()` function sends:

```json
{ "update": "Metro Fresh reports a stockout of Cola 500ml." }
```

The browser sends this body to `POST /api/analyse`. Its relative URL reaches the same Next.js application. The browser never receives the DeepSeek key.

## 2. The route validates the input

Open [`src/app/api/analyse/route.ts`](../src/app/api/analyse/route.ts). Next.js maps this folder to `/api/analyse`; the exported `POST()` function handles POST requests.

`request.json()` parses the body. `fieldUpdateSchema.safeParse(body)` then checks the contract in [`src/lib/schemas.ts`](../src/lib/schemas.ts). It accepts only `update`, requires a string, trims whitespace, and allows 1–8,000 characters. Parsing and validation are separate: valid JSON can still have the wrong fields or types.

Invalid input returns HTTP 400 before any paid model call. Valid input goes to `analyseUpdate(parsed.data.update)`.

Checkpoint: What happens to `{ "update": "   " }`? It becomes an empty string and fails validation.

## 3. The model extracts observations

Open [`src/lib/server/analyse.ts`](../src/lib/server/analyse.ts). `analyseUpdate()` calls `requestStructuredJson()` with the extraction prompt, update, and extraction schema. Then it calls `applyPolicy()`.

The extraction prompt asks for the outlet, SKU, and exact quotes for stockout, sales impact, pricing, damage, illness, embedded instructions, or other observations. Missing information uses `null`. The model does not choose final urgency or action.

An illustrative extraction for our report is:

```json
{
  "outlet": "Metro Fresh",
  "sku": "Cola 500ml",
  "quotes": {
    "stockout": "stockout of Cola 500ml",
    "sales_impact": null,
    "pricing": null,
    "damage": null,
    "illness": null,
    "prompt_injection": null,
    "other": null
  }
}
```

This illustrates the extraction contract; a live model can choose a different exact substring.

## 4. The SDK makes the network call

Open [`src/lib/server/deepseek.ts`](../src/lib/server/deepseek.ts). The OpenAI-compatible SDK points at `https://api.deepseek.com` and sends a chat-completion request. `getDeepSeekEnv()` in [`src/lib/server/env.ts`](../src/lib/server/env.ts) validates the server configuration.

The request contains a system prompt, the untrusted update, and a JSON schema. It uses JSON object mode, reasoning disabled, temperature zero, and a maximum of 2,048 output tokens. Temperature zero does not guarantee identical answers.

The defaults allow one SDK retry and 15 seconds per attempt. A separate 45-second abort signal bounds the overall request. There is one logical extraction call; retries may send additional network requests.

`server-only` prevents these modules from being imported into browser code. Locally the key lives in ignored `.env.local`; on Vercel it lives in a server environment variable.

## 5. Validate structure, then validate evidence

[`src/lib/llm/parse-response.ts`](../src/lib/llm/parse-response.ts) requires a completed response, nonempty content, parseable JSON, and the extraction schema. JSON object mode helps the provider produce JSON; Zod checks whether that JSON has the required structure.

Next, `validateGrounding()` in [`src/lib/triage/policy.ts`](../src/lib/triage/policy.ts) checks that every quote appears verbatim in the original update. Outlet and SKU must also appear after normalization. Fabricated evidence produces a 502 fallback.

These checks answer different questions:

| Check | What it proves |
| --- | --- |
| JSON parsing | The response is valid JSON. |
| Zod schema | Its fields and types match the contract. |
| Quote grounding | The text occurs in the report. |
| Inventory comparison | A supplied record supports a stock fact. |

Grounding does not prove that a representative's claim is true or correctly classified.

## 6. Backend rules make the decision

`applyPolicy()` matches one outlet and SKU against [`src/data/verified-stock.json`](../src/data/verified-stock.json). It cannot assign stock when the report names multiple outlets or SKUs.

For Metro Fresh and Cola 500ml, it finds 48 units. The stockout quote stays **unverified**. The supplied fictional stock record becomes **verified** evidence. Positive stock and a stockout claim produce:

```json
{
  "issue_category": "stock_discrepancy",
  "urgency": "high",
  "needs_human_review": true
}
```

These are three fields from the full seven-field result. The action asks for a shelf/backroom count, record freshness, and reconciliation with the supervisor.

Safety takes priority. Reported illness produces critical urgency; product damage produces high urgency. Pricing demands require evidence and manager approval. Claimed lost sales require missing details; the app invents no loss figure. Embedded instructions never gain authority over the assessment.

The final `analysisSchema.parse()` checks all seven fields. Human review requires a reason; no review requires a null reason. Review is advisory: the app does not notify a person or implement an approval queue.

## 7. The response returns to the browser

The route returns HTTP 200 with the assessment and `Cache-Control: no-store`. The browser validates the body with the same `analysisSchema` before rendering evidence, urgency, review status, missing information, and expandable JSON.

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

Start with [`tests/contracts.test.ts`](../tests/contracts.test.ts) for valid and invalid input/output. Read [`tests/policy.test.ts`](../tests/policy.test.ts) for decision rules and the safety regression. [`tests/deepseek.test.ts`](../tests/deepseek.test.ts) mocks provider completion and failures. [`tests/routes.test.ts`](../tests/routes.test.ts) checks HTTP behavior. These tests make no paid calls.

[`src/data/scenarios.json`](../src/data/scenarios.json) contains the five required scenarios and three extra scenarios. [`scripts/evaluate.mjs`](../scripts/evaluate.mjs) submits them over real HTTP and checks expected versus actual results. It makes eight paid provider calls. Run it only against your intended endpoint:

```sh
EVAL_URL=https://YOUR-DEMO.vercel.app EVAL_OUTPUT=evaluation/deployed-results.json npm run eval
```

Read [`EVALUATION.md`](../EVALUATION.md) for measured results and the failure/fix. A small passing evaluation is evidence for those cases, not a guarantee for arbitrary reports.

## 9. GitHub and Vercel serve different purposes

GitHub holds source, documentation, diagrams, sample inputs, and evaluation results. Git commits record versions. The key and generated build output stay outside Git.

Vercel installs dependencies, builds Next.js, serves the homepage, and runs the route handlers as server functions. The external network call still goes from the server to DeepSeek. There is no database or separate backend host.

When connected through Vercel's Git integration, pushes to `main` trigger production deployments and other branches receive preview deployments. A deployment builds a specific source version; editing files locally does not change the public app until that version is deployed.

After a change, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Commit and push the intended files. Check the public homepage, `/api/health`, and one real analysis after deployment. See the README for the actual repository and demo links.

## A useful next learning exercise

Trace this report without running it: **“City Corner reports a damaged Juice 1L pack and a customer feeling unwell.”** Find the priority branch in `applyPolicy()`. Explain why stock of 12 units does not reduce the safety urgency. Then submit that sample in the demo and compare your prediction with the result.
