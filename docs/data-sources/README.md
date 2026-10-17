# Public research samples

These are **real public source records selected for research**, separate from the fictional assessment fixtures. These files are archived samples, not runtime fixtures. The separate Product lookup screen reads Open Food Facts and Open Prices directly; UCI and FDA are not runtime integrations.

[`public-record-samples.json`](public-record-samples.json) contains eight selected records in four source groups:

- One Open Food Facts product record.
- One Open Prices observation for the same barcode and pack size.
- Five historical UCI Online Retail transaction rows.
- One FDA food-recall enforcement report.

Each group includes its original source URL, fetch timestamp, record dates where available, and interpretation limits. `stock_on_hand: null` is a research annotation, not a publisher field. None of these records establishes on-hand stock at a SalesEasy outlet.

The UCI sample omits customer identifiers. Its invoice timestamps were converted from Excel serial values to ISO local date-time strings; the source does not specify a time zone. The original archive SHA-256 and dataset attribution are retained for reproducibility. UCI lists CC BY 4.0.

Open Food Facts publishes its database under ODbL and individual contents under the Database Contents License. Open Prices publishes ODbL data. Source links and publisher attribution are retained. No product images, receipt images, contributor identities, or private email contents are included.

See [`../PUBLIC-DATA-RESEARCH.md`](../PUBLIC-DATA-RESEARCH.md) for official documentation, access and reuse statements, geographic scope, and recommended next steps. Public publication does not independently establish that every observation is accurate. In particular, the FDA report is research context, not a source for public alerts or current recall lifecycle status.
