"use client";

import { useState, type KeyboardEvent } from "react";
import type { Analysis } from "@/lib/schemas";
import type { Preferences } from "@/lib/preferences";
import { Icon } from "./icons";

export type ReportRecord = {
  id: string;
  update: string;
  result: Analysis;
  fallback: boolean;
  createdAt: string;
  collected: string[];
};
export type ResultView = Preferences["resultView"];

function summaryText(record: ReportRecord) {
  const r = record.result;
  return `SALESEASY FIELD ASSESSMENT\n\nReport: ${record.update}\n\n${record.fallback ? "AUTOMATED ANALYSIS UNAVAILABLE — HUMAN-REVIEW FALLBACK\n" : ""}Category: ${r.issue_category.replaceAll("_", " ")}\nUrgency: ${r.urgency}\nHuman review: ${r.needs_human_review ? "Required" : "Not required by demo policy"}\n${r.review_reason ? `Reason: ${r.review_reason}\n` : ""}\nNext action: ${r.recommended_next_action}\n\nEvidence:\n${r.evidence.map((e) => `- [${e.status}; ${e.source}] ${e.detail}`).join("\n")}\n\nInformation to collect:\n${r.missing_information.map((e) => `- ${e}`).join("\n") || "None identified."}\n\nAdvisory only. No reviewer was notified and no action was executed.`;
}

export function AssessmentPanel({
  record,
  busy,
  status,
  view,
  onView,
  onToggle,
}: {
  record: ReportRecord | null;
  busy: boolean;
  status: string;
  view: ResultView;
  onView: (view: ResultView) => void;
  onToggle: (item: string) => void;
}) {
  const [feedback, setFeedback] = useState("");
  async function copy(json: boolean) {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(
        json ? JSON.stringify(record.result, null, 2) : summaryText(record),
      );
      setFeedback(json ? "JSON copied." : "Summary copied.");
    } catch {
      setFeedback("Copy is unavailable. You can download the JSON instead.");
    }
  }
  function download() {
    if (!record) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(record.result, null, 2) + "\n"], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `saleseasy-${record.createdAt.replaceAll(":", "-")}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback("JSON download started.");
  }
  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    const tabs: ResultView[] = ["summary", "evidence", "json"];
    const index = tabs.indexOf(view);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 3
        : event.key === "ArrowLeft"
          ? (index + 2) % 3
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 2
              : null;
    if (next === null) return;
    event.preventDefault();
    onView(tabs[next]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  const r = record?.result;
  return (
    <section
      className="panel assessment-panel"
      aria-labelledby="result-heading"
      aria-busy={busy}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">02 / ASSESSMENT</p>
          <h2 id="result-heading" tabIndex={-1}>
            A grounded next step
          </h2>
        </div>
        <span className="step-mark">
          <Icon name="shield" />
        </span>
      </div>
      {busy ? (
        <div className="empty-state" role="status">
          <span className="loading-ring" />
          <h3>Reading the report.</h3>
          <p>
            Checking observations against the reference inventory. This can take
            a moment.
          </p>
        </div>
      ) : !record ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="reports" width="28" height="28" />
          </span>
          <h3>Your next step starts here.</h3>
          <p>
            Add a field report to see the recommendation, supporting evidence,
            and what still needs a person.
          </p>
          <div className="empty-flow">
            <span>Report</span>
            <span>→</span>
            <span>Evidence</span>
            <span>→</span>
            <span>Next action</span>
          </div>
          {status && (
            <p role="status" className="status-message">
              {status}
            </p>
          )}
        </div>
      ) : (
        <div id="assessment-result">
          <p className="sr-only" role="status">
            {record.fallback
              ? "Automated assessment unavailable. Human review fallback loaded."
              : `Assessment complete. ${r!.urgency} urgency. ${r!.needs_human_review ? "Human review needed." : "Standard follow-up."}`}
          </p>
          {record.fallback && (
            <p className="notice error" role="alert">
              <strong>Automated analysis unavailable.</strong> This is a
              human-review fallback, not a completed assessment.
            </p>
          )}
          <div className="badges">
            <span className={`badge urgency-${r!.urgency}`}>
              <span className="status-dot" />
              {r!.urgency} urgency
            </span>
            <span className="badge neutral">
              {r!.issue_category.replaceAll("_", " ")}
            </span>
          </div>
          <div
            className={`review ${r!.needs_human_review ? "review-required" : ""}`}
          >
            <div className="review-label">
              <Icon name={r!.needs_human_review ? "shield" : "check"} />
              <strong>
                {r!.needs_human_review
                  ? "Human review needed"
                  : "Standard follow-up"}
              </strong>
            </div>
            {r!.review_reason ? (
              <p>{r!.review_reason}</p>
            ) : (
              <p>
                No additional review is required by the demo policy.
                Recommendations remain advisory.
              </p>
            )}
          </div>
          <div className="result-actions">
            <button onClick={() => copy(false)}>
              <Icon name="copy" />
              Copy summary
            </button>
            <button onClick={download}>
              <Icon name="download" />
              Download JSON
            </button>
          </div>
          <p className="caption action-feedback" role="status">
            {feedback}
          </p>
          <div
            className="result-tabs"
            role="tablist"
            aria-label="Assessment views"
          >
            {(["summary", "evidence", "json"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                id={`tab-${tab}`}
                aria-controls="assessment-view-content"
                aria-selected={view === tab}
                tabIndex={view === tab ? 0 : -1}
                onKeyDown={moveTab}
                onClick={() => {
                  onView(tab);
                  setFeedback("");
                }}
              >
                {tab === "summary"
                  ? "Overview"
                  : tab === "evidence"
                    ? `Evidence (${r!.evidence.length})`
                    : "JSON"}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="assessment-view-content"
            aria-labelledby={`tab-${view}`}
            tabIndex={0}
            className="result-content"
          >
            {view === "summary" && (
              <>
                <p className="eyebrow muted">RECOMMENDED NEXT ACTION</p>
                <p className="recommendation">{r!.recommended_next_action}</p>
                {r!.missing_information.length > 0 && (
                  <div className="information">
                    <div className="section-label">
                      <h3>Information to collect</h3>
                      <span className="mono">
                        {record.collected.length}/
                        {r!.missing_information.length}
                      </span>
                    </div>
                    <p className="caption">
                      A personal checklist. Checking an item does not verify the
                      claim.
                    </p>
                    <ul className="checklist">
                      {r!.missing_information.map((item, index) => (
                        <li key={`${index}-${item}`}>
                          <label>
                            <input
                              type="checkbox"
                              checked={record.collected.includes(item)}
                              onChange={() => onToggle(item)}
                            />
                            <span>{item}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {view === "evidence" && (
              <>
                <p className="caption">
                  A verified system record can still differ from physical shelf
                  stock.
                </p>
                <ul className="evidence">
                  {r!.evidence.map((item, index) => (
                    <li key={index}>
                      <span
                        className={`source-label ${item.status === "verified" ? "source-verified" : "source-claim"}`}
                      >
                        <Icon
                          name={
                            item.status === "verified" ? "inventory" : "reports"
                          }
                        />
                        {item.status === "verified"
                          ? "Verified fictional system record"
                          : "Unverified field claim"}
                      </span>
                      <p>{item.detail}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {view === "json" && (
              <>
                <div className="section-label">
                  <p className="caption">The exact seven-field API response.</p>
                  <button className="text-button" onClick={() => copy(true)}>
                    <Icon name="copy" />
                    Copy JSON
                  </button>
                </div>
                <pre>{JSON.stringify(r, null, 2)}</pre>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
