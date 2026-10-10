# Evaluation record

Executed on 2026-10-10 against the locally running built Next.js app at `http://127.0.0.1:3119`, using the configured real DeepSeek API. All inventory and field inputs are fictional. This is a small evaluation snapshot, not a production reliability guarantee.

## Expected versus actual

| Case             | Expected category / urgency / review | Actual category / urgency / review | Result |
| ---------------- | ------------------------------------ | ---------------------------------- | ------ |
| lost-sales       | stockout / medium / yes              | stockout / medium / yes            | PASS   |
| stock-conflict   | stock_discrepancy / high / yes       | stock_discrepancy / high / yes     | PASS   |
| price-match      | pricing / medium / yes               | pricing / medium / yes             | PASS   |
| injection        | unknown / medium / yes               | unknown / medium / yes             | PASS   |
| safety           | product_safety / critical / yes      | product_safety / critical / yes    | PASS   |
| unknown-outlet   | stockout / medium / yes              | stockout / medium / yes            | PASS   |
| routine-stockout | stockout / medium / no               | stockout / medium / no             | PASS   |
| negated-safety   | other / low / no                     | other / low / no                   | PASS   |

**8/8 passed.** The first five cases are required by the brief. The extra three cover an unknown outlet, a routine replenishment request without claimed impact, and a negated safety incident.

Full inputs, expected outcomes, actual seven-field responses, HTTP status, latency and individual assertions are saved in [evaluation/results.json](evaluation/results.json). In this built-app run, request durations ranged from 711 to 1,719 ms. An earlier development-server run also passed all eight cases.

## Observed failure and improvement

A provider-failure regression test used: **“No customer was ill yesterday and a customer is unwell today.”** The expected fallback was `product_safety`, `critical`, with human review. The first implementation returned `unknown`, `medium`, with human review: it checked only the first illness word in the clause, saw a nearby negation, and missed the affirmative report later in the sentence.

The fix iterates over every safety mention and checks nearby negation for each one. The same regression now passes and returns critical safety escalation. [evaluation/failure-and-fix.json](evaluation/failure-and-fix.json) records the before/after result; `tests/policy.test.ts` retains the test. This was a deterministic test with a synthetic timeout, not a live DeepSeek failure.

The fix was also checked through the **built app over real HTTP with the API key intentionally absent**. It returned HTTP 503, `CONFIGURATION_ERROR`, critical product safety and human review. No provider call occurred. See [evaluation/configuration-fallback.json](evaluation/configuration-fallback.json). The interface visibly labels this response as an unavailable automated analysis and a human-review fallback.

The initial unfinished DeepSeek route also failed TypeScript parsing (`TS1005`, missing closing brace). Replacing it with the shared assessment handler resolved the compilation failure and removed the premature input-echo return.

## Additional verification

- 50 passing automated tests across input/output contracts, mocked SDK behavior, policy decisions and HTTP handlers. These tests do not call the real provider.
- TypeScript check, ESLint and optimized Next.js build passed.
- Real HTTP checks: health 200; malformed JSON, empty input, extra fields and >8,000 characters each 400; unsupported method 405; original `/api/deepseek` alias 200 with injection resisted.
- Browser: sample selection, textarea, submission, real-provider stock-discrepancy display, verified/unverified evidence, expandable JSON, whitespace-disabled submit and actual HTTP 503 fallback rendering.
- Desktop layout and 390px-wide mobile layout inspected. Mobile document width equals viewport width (390px); JSON and inventory scroll inside their own regions.

Screenshots: [desktop](evaluation/desktop.png), [mobile](evaluation/mobile.png), [provider unavailable](evaluation/fallback.png).

## Runtime and dependency checks

The local Node binary reports **v25.6.1**; the local checks above passed on that installed runtime. The project selects Node 24 through `.nvmrc` and `engines`. The [GitHub Actions run](https://github.com/raj921/sales-easy-copilot/actions/runs/38065564630) passed the same 50 tests, lint, build, and TypeScript checks on Node 24. Vercel also built and serves the app on Node 24.

`npm audit --omit=dev` reported zero vulnerabilities on 2026-10-10. The full audit reports five high-severity entries in the development lint chain, all stemming from the [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The advisory lists no patched version, and the suggested audit fix downgrades the Next.js lint configuration to a different major. No forced downgrade was applied. This is a recorded tooling limitation, not a claim that the project is free of security risks.

## Limits

This evaluation covers eight provider examples and a focused set of mocked failures. It does not establish reliability for arbitrary language, indirect prompt injections or multilingual input. Verbatim grounding proves that a quote appears in the update, not that its classification or assertion is true. Nearby-negation checks remain heuristic. There is no operational reviewer notification, database, or live stock integration.

## Public deployment verification

On 2026-10-10, all eight cases passed against **https://sales-easy-copilot.vercel.app** using the real configured DeepSeek provider. Full expected/actual outcomes and assertions are in [evaluation/deployed-results.json](evaluation/deployed-results.json). All eight returned HTTP 200; durations ranged from 926 to 2,093 ms.

The homepage and health endpoint returned HTTP 200 without authentication, cookies, or a deployment bypass. Empty, malformed, extra-field, and oversized inputs returned 400; GET on the analysis endpoint returned 405. The hosted interface was also checked in Ego Browser: a Metro Fresh stockout report displayed high urgency, stock discrepancy, human review, and the stock reconciliation action. See [the hosted browser screenshot](evaluation/deployed-browser.png).
