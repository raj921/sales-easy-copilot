# Public data for a SalesEasy extension

Research date: **17 October 2026**. Scope: source research and small read-only samples, followed by a separate read-only product/price lookup extension. Inventory fixtures and the assessment pipeline remain fictional. The original assessment says to use fictional data only; keep any real-data experiment separate from that submission.

## Findings

There are useful real public sources for product details, dated prices, historical sales, and published recall records. **None of the examined sources provides current outlet-and-SKU on-hand inventory for the assessment's three fictional outlets.** A name, barcode, transaction quantity, advertised availability, or price observation cannot establish physical stock. This conclusion is limited to the sources examined; it is not a claim that no retailer offers an inventory integration.

| Source | What it supplies | Geographic and time scope | Suitable use | Does it establish current stock? |
| --- | --- | --- | --- | --- |
| Open Food Facts | Community-contributed food product descriptions and label data | Worldwide contributions; completeness and record age vary | Match a barcode to a product and package size | No |
| Open Prices | Product/store/date/currency price observations and supporting proof references | Worldwide contributions; location coverage and observation dates vary | Check a specific, dated competitor-price claim | No |
| UCI Online Retail / II | Real historical invoices and quantities per transaction | One UK-based online gift retailer with customer-country fields; 2009–2011 | Historical sales analysis and evaluation | No |
| openFDA food enforcement | Published FDA food-recall enforcement records | US regulatory context; publicly releasable records from 2004, updated weekly | Research and historical safety context | No |

Sources: [Open Food Facts documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/), [Open Prices project](https://github.com/openfoodfacts/open-prices), [UCI Online Retail](https://archive.ics.uci.edu/dataset/352/online+retail), [UCI Online Retail II](https://archive.ics.uci.edu/dataset/502/online+retail+ii), [FDA overview](https://open.fda.gov/apis/food/enforcement/).

## 1. Open Food Facts: product identity

Use barcode, product name, brand, package quantity, ingredient/allergen information, country tags, and record timestamps where available. These are product metadata, not verified observations at a particular store. The publisher explicitly states that voluntary contributions do not guarantee accuracy, completeness, or reliability. Country tags do not prove current sale or availability there. [API overview](https://openfoodfacts.github.io/openfoodfacts-server/api/), [product reference](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v3/).

- Documentation currently recommends API v3 for new integrations; v2 remains supported but is marked deprecated. Example read pattern: `GET https://world.openfoodfacts.org/api/v3.6/product/{barcode}.json`. Reads require a custom application User-Agent, not a login; follow current limits and use bulk downloads for larger imports. [Access and versions](https://openfoodfacts.github.io/openfoodfacts-server/api/).
- Bulk data: [official downloads](https://world.openfoodfacts.org/data).
- Publisher licensing: database ODbL, individual contents Database Contents License, images CC BY-SA. Review the publisher's reuse conditions before combining or redistributing datasets. [License guide](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/tutorials/license-be-on-the-legal-side.md).

A small API check found barcode `5449000000996` described as Coca-Cola Original, **330 ml**. It must not be silently joined to the assessment's Cola **500 ml** record. The selected record is recorded in [public-record-samples.json](data-sources/public-record-samples.json).

## 2. Open Prices: observed prices

This Open Food Facts project collects prices from around the world. It permits browsing without an account; some API operations require authentication. The official data guide publishes daily regenerated JSONL exports. A daily export does **not** mean every underlying price was observed that day. [Project](https://github.com/openfoodfacts/open-prices), [API access](https://github.com/openfoodfacts/open-prices/blob/main/API.md), [exports and ODbL statement](https://github.com/openfoodfacts/open-prices/blob/main/docs/guides/data.md).

- API docs: <https://prices.openfoodfacts.org/api/docs>
- Read-only, barcode/date-filtered example: <https://prices.openfoodfacts.org/api/v1/prices?product_code=5449000000996&date__lte=2026-10-17&order_by=-date&size=1>. The official [API schema](https://prices.openfoodfacts.org/api/schema?format=json) documents these filters.
- Downloads: [prices](https://prices.openfoodfacts.org/data/prices.jsonl.gz), [locations](https://prices.openfoodfacts.org/data/locations.jsonl.gz), [proofs](https://prices.openfoodfacts.org/data/proofs.jsonl.gz).

A live anonymous read for barcode `5449000000996`, ordered by observation date and restricted to dates on or before this research date, returned record `262672`: **Coca-Cola Original, 330 ml, EUR 1.10**, observed **6 April 2026** at **HiperDino Express Alegría Barranco, Los Cristianos, Spain**, with `PRICE_TAG` proof `107009` and no discount flag. This is a six-month-old, single-store observation, not a current/global price or the fixture's 500 ml product. [Filtered sample endpoint](https://prices.openfoodfacts.org/api/v1/prices?product_code=5449000000996&date__lte=2026-10-17&order_by=-date&size=1).

For SalesEasy, match exact product/package, store, observation date, currency, discount conditions, and proof. A dated observation at one location does not support “competitors are discounting everywhere” or authorize an immediate price match. Receipts can record purchased quantity; that is not remaining shelf stock.

## 3. UCI Online Retail: historical transactions

UCI Online Retail contains 541,909 transaction rows from **1 December 2010 to 9 December 2011**. Fields include `InvoiceNo`, `StockCode`, `Description`, `Quantity`, `InvoiceDate`, `UnitPrice`, `CustomerID`, and `Country`. Quantity is per transaction; price is in sterling; a cancellation invoice starts with `c`. The publisher identifies a UK-based non-store gift retailer, not a global FMCG inventory network. [Dataset and field definitions](https://archive.ics.uci.edu/dataset/352/online+retail).

- [Original ZIP download](https://archive.ics.uci.edu/static/public/352/online+retail.zip) containing `Online Retail.xlsx`.
- [Online Retail II](https://archive.ics.uci.edu/dataset/502/online+retail+ii): 1,067,371 rows, **1 December 2009 to 9 December 2011**, with missing values reported by UCI. [Original ZIP](https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip).
- UCI lists **CC BY 4.0** for both. Attribute the dataset and preserve its historical scope. These datasets overlap, so do not treat them as independent current feeds. [Online Retail license](https://archive.ics.uci.edu/dataset/352/online+retail), [Online Retail II license](https://archive.ics.uci.edu/dataset/502/online+retail+ii).

The selected sample contains five original transaction rows. Its first record is invoice `536365`, product `85123A` (WHITE HANGING HEART T-LIGHT HOLDER), quantity **6**, **1 December 2010, 08:26**, unit price **GBP 2.55**, customer country **United Kingdom**. It is a historical purchase, not six units currently in stock. See [saved selected records](data-sources/public-record-samples.json).

Use this for historical demand examples, cancellation handling, and numerical grounding tests. Do not derive current stock by subtracting observed sales: opening stock, receipts, transfers, losses, and adjustments are absent. Customer-country is not store location. Public examples need no customer identifiers.

## 4. openFDA: published recall research

Useful fields include `recall_number`, `product_description`, `code_info` (batch/lot text), `reason_for_recall`, `distribution_pattern`, `report_date`, and `product_quantity`. The last field describes recalled quantity, not current retailer inventory. [Field reference](https://open.fda.gov/apis/food/enforcement/searchable-fields/).

- API: <https://api.fda.gov/food/enforcement.json?limit=1>
- [Overview and restrictions](https://open.fda.gov/apis/food/enforcement/).
- [Terms](https://open.fda.gov/terms/): generally public domain/CC0 unless otherwise marked; attribution requested; access limits apply.

A sample record `H-1407-2026`, reported **7 October 2026**, concerns Todd's Seeds Salad Sprouting Mixture, lot `TS-633-2`; its **37,481 retail units** is a recall quantity. It does not establish illness causation or stock at any SalesEasy outlet. See [saved selected records](data-sources/public-record-samples.json).

FDA explicitly says this endpoint must not be used to issue public alerts or track recall lifecycle; recall status is not updated after classification. Keep it as research context. Operational review needs current official notices and a confirmed product, batch, geography, and distribution match. A keyword match alone is insufficient. [FDA limitations](https://open.fda.gov/apis/food/enforcement/).

## Implemented extension and future scope

Start with **read-only barcode lookup from Open Food Facts**, then a separately labelled **dated-price lookup from Open Prices**. Preserve source URL, source record ID, observation time, fetch time, matching basis, and uncertainty. Missing, stale, mismatched, or unavailable sources must remain unknown and trigger review where needed.

Keep actual inventory as a separate business-controlled integration, such as an authorized ERP/POS record with outlet, exact SKU, quantity, timestamp, and provenance. Even system on-hand can differ from shelf availability. Use UCI only for historical analysis and FDA enforcement records only for the research purpose above.

Do not join these sources by loose product name, relabel them all as verified stock, or change the fictional assessment silently. The workspace now implements a separate `POST /api/products/lookup` adapter for Open Food Facts and Open Prices. It validates barcodes, bounds each source request to eight seconds, allows partial results, and displays provenance and age. Public responses may be cached for 15 minutes. The lookup is not fed to DeepSeek or joined to assessment stock. UCI and FDA remain research-only; no emails are generated or sent.
