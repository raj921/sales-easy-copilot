"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  productLookupInputSchema,
  productLookupSchema,
  type ProductLookup,
} from "@/lib/public-data-schema";
import { Icon } from "./icons";

function displayDate(value: string) {
  return new Date(
    value.length === 10 ? value + "T00:00:00Z" : value,
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ProductLookupPanel() {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<ProductLookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = productLookupInputSchema.safeParse({ barcode });
    if (!parsed.success) {
      setError(
        "Check the barcode, including its last check digit. Use 8, 12, 13 or 14 digits.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/products/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(20000),
        ]),
      });
      const parsedResult = productLookupSchema.safeParse(await response.json());
      if (!parsedResult.success) throw new Error("Invalid public data");
      setResult(parsedResult.data);
    } catch {
      setError(
        controller.signal.aborted
          ? "Lookup cancelled. You can edit the barcode and try again."
          : "The lookup could not be completed. Please retry shortly.",
      );
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  return (
    <div className="lookup-workspace">
      <section className="panel lookup-input" aria-labelledby="lookup-heading">
        <p className="eyebrow">01 / IDENTIFY</p>
        <h2 id="lookup-heading">Start with the barcode.</h2>
        <p className="muted">
          Find public product details and dated store-price observations for the
          same identifier.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="barcode">Product barcode</label>
          <div className="barcode-input">
            <Icon name="search" />
            <input
              id="barcode"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 5449000000996"
              maxLength={25}
              value={barcode}
              disabled={busy}
              onChange={(e) => {
                setBarcode(e.target.value);
                setResult(null);
                setError("");
              }}
              aria-describedby="barcode-help"
            />
          </div>
          <p className="caption" id="barcode-help">
            EAN, UPC, or GTIN · 8, 12, 13 or 14 digits
          </p>
          <button
            type="submit"
            className="primary"
            disabled={busy || !barcode.trim()}
          >
            {busy ? "Looking up public records…" : "Look up product"}
            <Icon name="arrow" />
          </button>
          {busy && (
            <button
              type="button"
              className="text-button"
              onClick={() => request.current?.abort()}
            >
              Cancel lookup
            </button>
          )}
        </form>
        <button
          className="example-lookup"
          disabled={busy}
          onClick={() => {
            setBarcode("5449000000996");
            setResult(null);
            setError("");
          }}
        >
          <span className="example-icon">
            <Icon name="inventory" />
          </span>
          <span>
            <strong>Try a real example</strong>
            <small>Coca-Cola Original · barcode 5449000000996</small>
          </span>
          <Icon name="arrow" />
        </button>
        <div className="source-note">
          <Icon name="shield" />
          <p>
            Public context, not outlet inventory. A product listing or price tag
            does not establish how many units are in stock.
          </p>
        </div>
        <div className="provider-links">
          <a
            href="https://world.openfoodfacts.org/data"
            target="_blank"
            rel="noreferrer"
          >
            Open Food Facts <Icon name="external" />
          </a>
          <a
            href="https://prices.openfoodfacts.org"
            target="_blank"
            rel="noreferrer"
          >
            Open Prices <Icon name="external" />
          </a>
        </div>
        <p className="caption">
          Community-contributed data · ODbL / Database Contents License.
          Attribution is retained on every result.
        </p>
      </section>
      <section
        className="panel public-results"
        aria-labelledby="public-heading"
        aria-busy={busy}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">02 / PUBLIC CONTEXT</p>
            <h2 id="public-heading">Know what the source says.</h2>
          </div>
          <span className="step-mark">
            <Icon name="search" />
          </span>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <div className="empty-state" role="status">
            <span className="loading-ring" />
            <h3>Checking the original sources.</h3>
            <p>
              Product details and price observations are requested
              independently.
            </p>
          </div>
        )}
        {!result && !busy && !error && (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="search" width="28" height="28" />
            </span>
            <h3>Real records. Clear boundaries.</h3>
            <p>
              Search a barcode to see its product identity, package size, source
              dates, and available price observations.
            </p>
            <span className="subtle-tag">
              No stock quantity will be inferred.
            </span>
          </div>
        )}
        {result && (
          <div className="lookup-result" aria-live="polite">
            <div className="section-label">
              <span className="source-label source-public">
                Open Food Facts
              </span>
              <span className="mono small-label">{result.barcode}</span>
            </div>
            {result.product ? (
              <>
                <h3 className="product-name">
                  {result.product.name ?? "Product name not provided"}
                </h3>
                <p className="muted">
                  {result.product.brands ?? "Brand not provided"}
                </p>
                <div className="product-facts">
                  <div>
                    <span className="caption">Pack size</span>
                    <strong>{result.product.quantity ?? "Not provided"}</strong>
                  </div>
                  <div>
                    <span className="caption">Source updated</span>
                    <strong>
                      {result.product.modified_at
                        ? displayDate(result.product.modified_at)
                        : "Not provided"}
                    </strong>
                  </div>
                  <div>
                    <span className="caption">Stock on hand</span>
                    <strong>Unknown</strong>
                  </div>
                </div>
                <a
                  className="source-link"
                  href={result.product.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View original product record <Icon name="external" />
                </a>
              </>
            ) : (
              <p className="notice warning">
                {result.product_status === "not_found"
                  ? "This barcode was not found in Open Food Facts. It may still be a valid product."
                  : "Product details are temporarily unavailable. Any price observations below are listed by barcode only."}
              </p>
            )}
            <div className="section-label prices-heading">
              <h3>Observed prices</h3>
              <span className="subtle-tag">Open Prices</span>
            </div>
            <p className="caption">
              Up to 8 observations, newest first. Each price applies to its
              listed date and location. No price conversion or price match is
              authorized.
            </p>
            {result.price_status === "unavailable" ? (
              <p className="notice warning">
                The price source could not be loaded. This does not mean that no
                prices exist.
              </p>
            ) : result.price_status === "none" ? (
              <div className="quiet-empty">
                No dated price observations were returned for this barcode.
              </div>
            ) : (
              <ul className="price-list">
                {result.prices.map((price) => {
                  const daysOld = Math.max(
                    0,
                    Math.floor(
                      (new Date(result.fetched_at).getTime() -
                        new Date(price.observed_on + "T00:00:00Z").getTime()) /
                        86400000,
                    ),
                  );
                  return (
                    <li key={price.id}>
                      <div className="price-top">
                        <strong className="price-value">
                          {new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency: price.currency,
                          }).format(price.amount)}
                        </strong>
                        <span
                          className={`subtle-tag ${daysOld > 90 ? "tag-warning" : ""}`}
                        >
                          {daysOld > 90
                            ? "Older than 90 days"
                            : "Dated observation"}
                        </span>
                      </div>
                      <p>
                        {[price.store, price.city, price.country]
                          .filter(Boolean)
                          .join(" · ") || "Location not provided"}
                      </p>
                      <div className="price-meta">
                        <span>{displayDate(price.observed_on)}</span>
                        <span>
                          {price.pack_size ?? "Pack size not provided"}
                        </span>
                        <span>
                          {price.discounted
                            ? "Discount flagged by source"
                            : "No discount flag"}
                        </span>
                      </div>
                      <a
                        className="source-link"
                        href={price.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source record #{price.id} <Icon name="external" />
                      </a>
                      {price.proof_type && (
                        <span className="caption proof-type">
                          Proof type:{" "}
                          {price.proof_type.replaceAll("_", " ").toLowerCase()}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="caption lookup-footer">
              Looked up {displayDate(result.fetched_at)}. Public observations
              can be incomplete or incorrect. Countries in a product catalogue
              do not confirm local availability.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
