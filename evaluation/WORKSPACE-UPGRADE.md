# Workspace and public lookup verification

Date: 17 October 2026. This extends the existing assessment UI and adds an independent public-data lookup. Assessment stock remains fictional; lookup results are not used as assessment evidence.

## Automated checks

- 83 mocked unit/handler tests passed across six test files (63 existing plus 20 public-data/preferences tests).
- TypeScript, ESLint, production build, and whitespace checks passed.
- Barcode tests cover valid lengths/checksums, normalization, malformed input, and rejected URLs before network access.
- Public-source tests cover independent failures, missing products, mismatched identifiers, future observations, malformed prices, provenance, and safe error responses.
- Preference tests cover defaults and malformed stored content.

## Real local integration

The production build ran at `http://127.0.0.1:3119`.

- The stock-conflict report was assessed through the real configured DeepSeek provider and displayed high urgency, human review and the 48-unit fictional record.
- Real public HTTP lookup for `5449000000996` returned Coca-Cola Original **330 ml** and two dated price observations. The newest returned observation was EUR 1.10 on 6 April 2026 in Los Cristianos, Spain. It is historical, not a current global price or proof of stock.
- [Saved public response](workspace-public-lookup.json) preserves the observed records. [Downloaded assessment JSON](workspace-export-example.json) contains the existing seven fields.

## Browser workflow

Checked in Ego browser against the production build:

- Ctrl/Cmd + Enter submitted a report; completion focused the assessment heading.
- Overview, Evidence and JSON tabs worked, including keyboard navigation and valid tab/panel associations.
- Summary copy reported success. Download produced the seven-field JSON file.
- A checklist tick survived opening a new report and reopening the prior assessment without another model request.
- Light/dark appearance, compact spacing and initial-result preferences persisted. Escape closed the native preferences dialog and restored focus to its trigger.
- Navigation retained tab-memory assessments. Reload cleared history; only `saleseasy-preferences-v1` remained in local storage.
- Invalid barcode input showed its check-digit message before submitting.
- Real product lookup displayed source links, original pack size, unknown stock, dated prices and age warnings.
- Desktop emulation: inner width 1440, document width 1425, two result/editor columns. Mobile emulation: inner/document width 390, single 358px column; no page overflow. Screenshots: [desktop](workspace-desktop.png), [mobile](workspace-mobile.png).

## Controlled UI failure checks

These used temporary, browser-only fetch substitutions, restored afterward. They are **simulations**, not claims of a real provider outage.

- An HTTP 503 response with a valid review-fallback assessment displayed “Automated analysis unavailable,” required human review and preserved the input. It did not look like a completed successful assessment.
- An abortable pending request allowed Cancel, preserved the report, displayed cancellation status and re-enabled submission. No provider call was made for this simulation.

## Limits

Public sources can be incomplete, inaccurate, stale or unavailable. The source cache may retain a response for 15 minutes; lookup time is not source refresh time. Cancellation stops browser waiting, not necessarily upstream processing. Checklist ticks do not verify evidence. No operational reviewer is notified. This is a small verification snapshot, not a production reliability guarantee. Existing real-provider ten-case assessment results are recorded separately in EVALUATION.md; they were not rerun for this UI-only assessment change.
