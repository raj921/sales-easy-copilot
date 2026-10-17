# SalesEasy runtime diagrams

Updated for the deployed workspace and separate public-data lookup. The drawings use black strokes, editable text and ordinary arrows, without source-file paths.

## Three views

1. **[Network overview](network-diagram.png)** — browser, one Next.js app on Vercel, canonical assessment route and alias, fictional inventory, server-only configuration, DeepSeek, separate public lookup route, Open Food Facts, Open Prices, and the liveness route. Double-headed arrows represent request and response; dashed boxes show execution boundaries.
2. **[Assessment request/response](system-design.png)** — report and matched fictional stock go to DeepSeek, which proposes extraction and a tailored assessment. Backend structure, evidence and policy checks precede the seven-field response. Invalid input returns 400; provider/model failures return labelled human-review results with 502/503/504. The diagram also records the updated browser controls.
3. **[Public lookup request/response](public-data-flow.png)** — strict barcode and checksum validation, parallel read-only source requests, independent source validation, provenance, partial results and browser display. No lookup result reaches DeepSeek or becomes stock evidence.

Open **[sales-copilot-architecture.excalidraw](sales-copilot-architecture.excalidraw)** in Excalidraw to edit all three boards on one canvas. Individual `.excalidraw`, SVG and PNG files are included. PNG/SVG previews were exported from the actual Excalidraw rendering through EgoBrowser. The combined drawing contains **134 editable elements**. `sales-copilot-browser.excalidraw` saves the final browser scene, excluding deleted history. [Live canvas capture](excalidraw-live-updated.png).

## Important boundaries

- The assessment still uses the three fictional stock records: 0, 48 and 12 units. System on-hand does not prove shelf availability.
- Public lookup fetches real source records on request. Product metadata is not stock; dated, store-specific prices are not current global prices or approval to match a price.
- Each public-source request has an eight-second timeout. Next.js uses a 900-second revalidation setting; a cached record can be older than lookup time, especially if refresh fails. This is not a freshness guarantee.
- A product can be not found, or a source unavailable. Partial success remains usable with explicit status labels; both unavailable return 503. Unexpected failures return a safe generic 503 error.
- The 90-day price-age warning is a display threshold, not proof that younger observations remain current.
- Last-six assessment history and checklist notes stay in tab memory. Only appearance, density and preferred result tab use local storage. Reload clears reports.
- Review is advisory. The app does not notify a reviewer, change prices, place orders or implement an approval queue. There is no database or real inventory integration.

Checked against current route handlers, public-data adapter, model client, policy, response schemas and workspace components. These are documentation changes; runtime behavior is unchanged.

## Canvas controls

Use **Shift + 1** to fit all boards. Select a board group, then press **Shift + 2** to fit that board. Hold Space and drag to pan. The browser is left on the network overview.

The editable scene format follows [Excalidraw's official JSON schema](https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/codebase/json-schema.mdx).
