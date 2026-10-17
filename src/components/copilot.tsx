"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import scenarios from "@/data/scenarios.json";
import dynamicScenarios from "@/data/dynamic-scenarios.json";
import stock from "@/data/verified-stock.json";
import { analysisSchema } from "@/lib/schemas";
import {
  defaultPreferences,
  parsePreferences,
  type Preferences,
} from "@/lib/preferences";
import {
  AssessmentPanel,
  type ReportRecord,
  type ResultView,
} from "./assessment-panel";
import { ProductLookupPanel } from "./product-lookup";
import { Icon } from "./icons";

const examples = [...scenarios, ...dynamicScenarios];
const settingsKey = "saleseasy-preferences-v1";
const defaultSettings = JSON.stringify(defaultPreferences);
const subscribeSettings = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("saleseasy-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("saleseasy-preferences", callback);
  };
};
const readSettings = () => {
  try {
    return localStorage.getItem(settingsKey) ?? defaultSettings;
  } catch {
    return defaultSettings;
  }
};
type Section = "reports" | "products" | "inventory";
const sections = [
  {
    id: "reports",
    label: "Field reports",
    icon: "reports",
    description: "Turn observations into a next step.",
  },
  {
    id: "products",
    label: "Product lookup",
    icon: "search",
    description: "Explore real product records and dated prices.",
  },
  {
    id: "inventory",
    label: "Reference inventory",
    icon: "inventory",
    description:
      "Understand the fictional system records behind the assessment.",
  },
] as const;

export function Copilot() {
  const serializedSettings = useSyncExternalStore(
    subscribeSettings,
    readSettings,
    () => defaultSettings,
  );
  const preferences = parsePreferences(serializedSettings);
  const [section, setSection] = useState<Section>("reports");
  const [update, setUpdate] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<ResultView>("summary");
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [exampleFilter, setExampleFilter] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const active = history.find((record) => record.id === activeId) ?? null;
  const currentSection = sections.find((item) => item.id === section)!;

  function savePreference<Key extends keyof Preferences>(
    key: Key,
    value: Preferences[Key],
  ) {
    try {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({ ...preferences, [key]: value }),
      );
      window.dispatchEvent(new Event("saleseasy-preferences"));
      setSettingsStatus("Preferences saved on this device.");
    } catch {
      setSettingsStatus(
        "Browser storage is unavailable. Preferences could not be saved.",
      );
    }
  }
  function editReport(value: string) {
    setUpdate(value);
    setActiveId(null);
    setError("");
    setStatus("");
  }
  function newReport(value = "") {
    if (busy) return;
    editReport(value);
    setSection("reports");
    requestAnimationFrame(() => document.getElementById("update")?.focus());
  }
  function focusAssessment() {
    requestAnimationFrame(() => {
      const heading = document.getElementById("result-heading");
      if (!heading) return;
      heading.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 1000px)").matches) {
        heading.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    });
  }
  async function submitReport() {
    if (busy || !update.trim()) return;
    const report = update.trim();
    setBusy(true);
    setError("");
    setStatus("");
    setActiveId(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: report }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(60000),
        ]),
      });
      const parsed = analysisSchema.safeParse(await response.json());
      if (!parsed.success) {
        setError(
          response.status === 400
            ? "Enter a field update between 1 and 8,000 characters."
            : "The assessment could not be validated. Retry or ask a supervisor to review the report.",
        );
        return;
      }
      const record: ReportRecord = {
        id: crypto.randomUUID(),
        update: report,
        result: parsed.data,
        fallback: !response.ok,
        createdAt: new Date().toISOString(),
        collected: [],
      };
      setHistory((rows) => [record, ...rows].slice(0, 6));
      setActiveId(record.id);
      setView(preferences.resultView);
      focusAssessment();
    } catch {
      if (controller.signal.aborted)
        setStatus("Analysis cancelled. Your report is ready to edit.");
      else
        setError(
          "The request did not complete. Retry or ask a supervisor to review the report.",
        );
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  function reopen(record: ReportRecord) {
    if (busy) return;
    setSection("reports");
    setUpdate(record.update);
    setActiveId(record.id);
    setView(preferences.resultView);
    setError("");
    setStatus("");
    focusAssessment();
  }
  function toggleInformation(item: string) {
    setHistory((rows) =>
      rows.map((row) =>
        row.id === activeId
          ? {
              ...row,
              collected: row.collected.includes(item)
                ? row.collected.filter((value) => value !== item)
                : [...row.collected, item],
            }
          : row,
      ),
    );
  }
  return (
    <div
      className="app-shell"
      data-theme={preferences.theme}
      data-density={preferences.density}
    >
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link
          className="brand"
          href="/"
          aria-label="SalesEasy home"
          onClick={() => setSection("reports")}
        >
          <span className="brand-mark">
            s<span>e</span>
          </span>
          <span>
            SalesEasy<span className="brand-caption">FIELD OPERATIONS</span>
          </span>
        </Link>
        <div className="rail-group">
          <p className="rail-label">WORKSPACE</p>
          <nav aria-label="Main navigation">
            {sections.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${section === item.id ? "nav-active" : ""}`}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === "reports" && history.length > 0 && (
                  <span className="nav-count">{history.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="rail-history">
          <div className="rail-label history-label">
            <span>RECENT IN THIS TAB</span>
            <Icon name="clock" width="13" height="13" />
          </div>
          {history.length ? (
            <ul>
              {history.map((record) => (
                <li key={record.id}>
                  <button
                    disabled={busy}
                    onClick={() => reopen(record)}
                    aria-label={`Reopen assessment: ${record.update}`}
                  >
                    <span
                      className={`history-dot history-${record.result.urgency}`}
                    />
                    <span>
                      <strong>
                        {record.update.slice(0, 58)}
                        {record.update.length > 58 ? "…" : ""}
                      </strong>
                      <small>
                        {record.fallback
                          ? "Review fallback"
                          : record.result.issue_category.replaceAll("_", " ")}
                      </small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rail-empty">
              Your last six assessments will appear here.
            </p>
          )}
          <p className="rail-caption">History clears when you reload.</p>
        </div>
        <div className="rail-footer">
          <div className="demo-marker">
            <span />
            Assessment workspace
          </div>
          <p>
            Fictional inventory.
            <br />
            Recommendations need judgment.
          </p>
          <button
            className="rail-settings"
            onClick={() => settingsDialog.current?.showModal()}
          >
            <Icon name="settings" />
            Preferences
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{currentSection.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className="workspace-pill">
              <span />
              Demo workspace
            </span>
            <button
              className="icon-button"
              aria-label="Open preferences"
              onClick={() => settingsDialog.current?.showModal()}
            >
              <Icon name="settings" />
            </button>
          </div>
        </header>
        <main id="main-content">
          <header className="page-header">
            <div>
              <p className="eyebrow">
                SALESEASY /{" "}
                {section === "products" ? "PUBLIC DATA" : "FIELD OPERATIONS"}
              </p>
              <h1>
                {currentSection.label}
                <span className="title-dot">.</span>
              </h1>
              <p className="intro">{currentSection.description}</p>
            </div>
            {section === "reports" && (
              <button
                className="new-report"
                disabled={busy || (!update && !active)}
                onClick={() => newReport()}
              >
                <Icon name="plus" />
                New report
              </button>
            )}
          </header>
          {section === "reports" && (
            <>
              <div className="workspace-context">
                <span>
                  <Icon name="inventory" />
                  {stock.length} reference outlets
                </span>
                <span>
                  <Icon name="reports" />
                  {examples.length} fictional scenarios
                </span>
                <span className="context-note">
                  Fictional records · real model assessment
                </span>
              </div>
              <div className="workspace">
                <section
                  className="panel composer"
                  aria-labelledby="update-heading"
                >
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">01 / FIELD REPORT</p>
                      <h2 id="update-heading">What happened at the outlet?</h2>
                    </div>
                    <span className="step-mark">
                      <Icon name="reports" />
                    </span>
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitReport();
                    }}
                  >
                    <label htmlFor="update">Describe the observation</label>
                    <textarea
                      id="update"
                      value={update}
                      onChange={(event) => editReport(event.target.value)}
                      maxLength={8000}
                      required
                      disabled={busy}
                      placeholder="Include the outlet, SKU and what the representative observed…"
                      aria-describedby="update-help"
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          (event.metaKey || event.ctrlKey)
                        ) {
                          event.preventDefault();
                          void submitReport();
                        }
                      }}
                    />
                    <div className="input-meta" id="update-help">
                      <span>Use fictional data for this demo.</span>
                      <span className="mono">
                        {update.length.toLocaleString()} / 8,000
                      </span>
                    </div>
                    <div className="report-tips">
                      <span>Include</span>
                      <span>Outlet</span>
                      <span>Product / pack</span>
                      <span>Observation</span>
                      <span>When</span>
                    </div>
                    {error && (
                      <p className="notice error" role="alert">
                        {error}
                      </p>
                    )}
                    <button
                      className="primary"
                      type="submit"
                      disabled={busy || !update.trim()}
                    >
                      {busy ? "Assessing report…" : "Assess field update"}
                      <Icon name="arrow" />
                    </button>
                    <div className="composer-footer">
                      <span className="caption">
                        {busy
                          ? "You can cancel while the request is pending."
                          : "Tip: ⌘ / Ctrl + Enter to assess"}
                      </span>
                      {busy && (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => request.current?.abort()}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                  <details className="examples">
                    <summary>
                      Try a fictional scenario{" "}
                      <span className="mono">{examples.length}</span>
                    </summary>
                    <div className="example-filter">
                      <Icon name="search" />
                      <input
                        type="search"
                        aria-label="Filter scenarios"
                        placeholder="Find a scenario…"
                        value={exampleFilter}
                        onChange={(event) =>
                          setExampleFilter(event.target.value)
                        }
                      />
                    </div>
                    <div className="example-buttons">
                      {examples
                        .filter((item) =>
                          `${item.label} ${item.update}`
                            .toLowerCase()
                            .includes(exampleFilter.toLowerCase()),
                        )
                        .map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            disabled={busy}
                            onClick={() => editReport(item.update)}
                            aria-label={`Use example: ${item.label}`}
                          >
                            {item.label}
                            <Icon name="arrow" width="13" height="13" />
                          </button>
                        ))}
                    </div>
                    {!examples.some((item) =>
                      `${item.label} ${item.update}`
                        .toLowerCase()
                        .includes(exampleFilter.toLowerCase()),
                    ) && (
                      <p className="caption">
                        No matching scenarios. Try a different search.
                      </p>
                    )}
                  </details>
                  <p className="privacy-note">
                    <Icon name="shield" />
                    Reports are sent to DeepSeek only when you assess. History
                    is kept in memory for this tab.
                  </p>
                </section>
                <AssessmentPanel
                  key={active?.id ?? "empty"}
                  record={active}
                  busy={busy}
                  status={status}
                  view={view}
                  onView={setView}
                  onToggle={toggleInformation}
                />
              </div>
            </>
          )}
          {section === "products" && <ProductLookupPanel />}
          {section === "inventory" && (
            <section
              className="panel inventory-panel"
              aria-labelledby="stock-heading"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">REFERENCE / INVENTORY</p>
                  <h2 id="stock-heading">The assessment’s stock records</h2>
                </div>
                <span className="subtle-tag">Fictional data</span>
              </div>
              <p className="muted">
                These three records are supplied by the assessment brief. They
                are not a live inventory feed and have no supplied stock
                timestamp.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Outlet</th>
                      <th scope="col">Product</th>
                      <th scope="col">System stock</th>
                      <th scope="col">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item) => (
                      <tr key={item.outlet}>
                        <td>
                          <strong>{item.outlet}</strong>
                          <span className="table-subtitle">
                            Fictional outlet
                          </span>
                        </td>
                        <td>{item.sku}</td>
                        <td>
                          <span
                            className={`stock-count ${item.system_stock === 0 ? "stock-empty" : ""}`}
                          >
                            {item.system_stock}
                          </span>
                          <span className="caption"> units recorded</span>
                        </td>
                        <td>
                          <button
                            disabled={busy}
                            onClick={() =>
                              newReport(`${item.outlet}: ${item.sku}. `)
                            }
                          >
                            Create report
                            <Icon name="arrow" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="inventory-explainer">
                <div>
                  <Icon name="inventory" />
                  <h3>System record</h3>
                  <p>
                    The supplied quantity is verified within this fictional
                    dataset.
                  </p>
                </div>
                <div>
                  <Icon name="reports" />
                  <h3>Field observation</h3>
                  <p>
                    A representative’s claim remains unverified until someone
                    checks it.
                  </p>
                </div>
                <div>
                  <Icon name="shield" />
                  <h3>Physical availability</h3>
                  <p>
                    A current shelf and backroom count can differ from the
                    record.
                  </p>
                </div>
              </div>
            </section>
          )}
          <footer>
            <span>
              <Icon name="shield" />
              Advisory only. No prices, orders, or reviewer notifications are
              sent.
            </span>
            <span>SalesEasy / assessment + public-data tools</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={settingsDialog}
        className="preferences-dialog"
        aria-labelledby="preferences-heading"
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h2 id="preferences-heading">Preferences</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close preferences"
            onClick={() => settingsDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <p className="muted">
          Make the workspace easier to read. Preferences stay on this device.
        </p>
        <label htmlFor="theme">Appearance</label>
        <select
          id="theme"
          value={preferences.theme}
          onChange={(event) =>
            savePreference("theme", event.target.value as Preferences["theme"])
          }
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">Follow device</option>
        </select>
        <label htmlFor="density">Spacing</label>
        <select
          id="density"
          value={preferences.density}
          onChange={(event) =>
            savePreference(
              "density",
              event.target.value as Preferences["density"],
            )
          }
        >
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
        <label htmlFor="result-view">Open assessments in</label>
        <select
          id="result-view"
          value={preferences.resultView}
          onChange={(event) =>
            savePreference("resultView", event.target.value as ResultView)
          }
        >
          <option value="summary">Overview</option>
          <option value="evidence">Evidence</option>
          <option value="json">JSON</option>
        </select>
        <div className="source-note">
          <Icon name="shield" />
          <p>
            Only these display preferences are stored. Your reports and session
            history are not saved to browser storage.
          </p>
        </div>
        <p className="caption" role="status">
          {settingsStatus}
        </p>
        <button
          className="primary"
          onClick={() => settingsDialog.current?.close()}
        >
          Done
          <Icon name="check" />
        </button>
      </dialog>
    </div>
  );
}
