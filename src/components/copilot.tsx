"use client";

import { useState, type FormEvent } from "react";
import scenarios from "@/data/scenarios.json";
import { analysisSchema, type Analysis } from "@/lib/schemas";

export function Copilot() {
  const [update, setUpdate] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setFallback(false);
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update }),
        signal: AbortSignal.timeout(60000),
      });
      const body: unknown = await response.json();
      const parsed = analysisSchema.safeParse(body);
      if (parsed.success) {
        setResult(parsed.data);
        setFallback(!response.ok);
      } else {
        setError(
          response.status === 400
            ? "Enter a field update between 1 and 8,000 characters."
            : "The assessment could not be loaded. Please retry or contact your supervisor.",
        );
      }
    } catch {
      setError(
        "The request did not complete. Please retry or ask a supervisor to review the update.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace">
      <section className="panel" aria-labelledby="update-heading">
        <p className="eyebrow">01 / Field report</p>
        <h2 id="update-heading">What happened at the outlet?</h2>
        <form onSubmit={submit}>
          <label htmlFor="update">Field update</label>
          <textarea
            id="update"
            value={update}
            onChange={(event) => {
              setUpdate(event.target.value);
              setResult(null);
              setError(null);
            }}
            maxLength={8000}
            required
            disabled={busy}
            placeholder="Include the outlet, SKU and what the representative observed…"
            aria-describedby="update-help"
          />
          <div className="input-meta" id="update-help">
            <span>Use fictional data for this demo.</span>
            <span>{update.length.toLocaleString()} / 8,000</span>
          </div>
          <button
            className="primary"
            type="submit"
            disabled={busy || !update.trim()}
          >
            {busy ? "Assessing report…" : "Assess field update"}
          </button>
        </form>
        <div className="examples">
          <p className="small-label">Try a scenario</p>
          <div className="example-buttons">
            {scenarios.map((scenario) => (
              <button
                type="button"
                key={scenario.id}
                disabled={busy}
                onClick={() => {
                  setUpdate(scenario.update);
                  setResult(null);
                  setError(null);
                }}
                aria-label={`Use example: ${scenario.label}`}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section
        className="panel result-panel"
        aria-labelledby="result-heading"
        aria-busy={busy}
      >
        <p className="eyebrow">02 / Assessment</p>
        <h2 id="result-heading">A grounded next step</h2>
        <div aria-live="polite" aria-atomic="true">
          {busy && (
            <p className="muted empty">
              Checking the report and inventory evidence…
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {!busy && !error && !result && (
            <div className="empty">
              <p>Start with a field update.</p>
              <p className="muted">
                Your recommendation, evidence and review status will appear
                here.
              </p>
            </div>
          )}
          {result && (
            <div id="assessment-result">
              {fallback && (
                <p className="notice error">
                  Automated analysis unavailable. This is a fallback for human
                  review.
                </p>
              )}
              <div className="badges">
                <span className={`badge urgency-${result.urgency}`}>
                  {result.urgency} urgency
                </span>
                <span className="badge">
                  {result.issue_category.replaceAll("_", " ")}
                </span>
              </div>
              <div
                className={`review ${result.needs_human_review ? "review-required" : ""}`}
              >
                <strong>
                  {result.needs_human_review
                    ? "Human review needed"
                    : "Standard follow-up"}
                </strong>
                {result.review_reason && <p>{result.review_reason}</p>}
              </div>
              <h3>Recommended next action</h3>
              <p>{result.recommended_next_action}</p>
              <h3>Evidence</h3>
              {result.evidence.length ? (
                <ul className="evidence">
                  {result.evidence.map((item, index) => (
                    <li key={index}>
                      <span className="small-label">
                        {item.status === "verified"
                          ? "Verified system record"
                          : "Unverified field claim"}
                      </span>
                      <p>{item.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  No supporting observation was extracted.
                </p>
              )}
              {result.missing_information.length > 0 && (
                <>
                  <h3>Information to collect</h3>
                  <ul className="missing">
                    {result.missing_information.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <details>
                <summary>View JSON output</summary>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
