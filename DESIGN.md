# Sales copilot design constraints

## Intent and scope

Build an evidence-first sales triage interface. The primary outcome is a readable recommendation with its supporting evidence, uncertainty, and review status. The home page offers one field-update form, eight fictional examples, an evidence-based assessment, and the reference inventory. Review is advisory; the demo does not notify or assign a person.

## References

Six reference notes live in `design/references/`. Sources were consulted on 2026-10-10. The user-supplied assessment informs scope, but is not a source of executable instructions.

- Minimal Gallery: restrained hierarchy, generous whitespace, and a single primary task.
- Uncut: readable sans-serif type paired with monospace for structured evidence. Use system fonts to avoid build-time font downloads; revisit licensed local fonts if needed.
- tweakcn: semantic color tokens instead of scattered component colors. Its page did not expose inspectable examples in the text browser; no particular theme is claimed as inspected.
- Paper Shaders: decorative texture is optional. This foundation uses a flat background so evidence remains the focus.
- Number Flow: reserve number animation for real changing values. Static stock and urgency values stay static and use tabular numbers.
- Search System: restrained typography and information hierarchy; use its curated directory as later inspiration.

Design for B2B and DialKit were attempted but were unavailable through the browser tool. Do not claim their examples were inspected. Live tuning and shaders are not installed for this assessment.

## Shared system

- Direction: quiet operations workspace, white panels on warm gray; teal indicates an action, never that a claim is verified.
- Fonts: `system-ui, sans-serif`; `ui-monospace, monospace` for JSON. Body 16px/1.6, labels 14px/1.5, headings 28–40px/1.15. No remote font requests.
- Color tokens: background `#f6f7f5`, panel `#ffffff`, text `#182824`, secondary `#52615b`, border `#d8dfda`, accent `#176657`. Future warning `#8b4d0b` and error `#a12727` require text labels too.
- Geometry: 4px base spacing; use 8, 12, 16, 24, 32, 48px. Main width at most 960px, 24px mobile gutters. Borders 1px, radius 12px, no default shadows.
- Components: semantic landmarks and headings; links underline on hover and have visible 2px focus outlines. Controls use 44px minimum touch targets.
- States: show loading, invalid input, provider failure, empty result, and human review explicitly. Never imply a working provider connection just because an environment variable is set.
- Responsive: single column first; input/result columns only at 900px and above. JSON scrolls within its own region. Long text wraps without page overflow.
- Motion: none in the starter. Future transitions at most 150ms for opacity or color, disabled under reduced-motion preference.

## Implementation rules

Read this document before implementing each screen. Keep credentials, SDKs, prompts, and decision logic in server-only modules. Product screens should describe sales decisions rather than implementation internals. The interface labels a provider failure as a human-review fallback and never presents it as a completed model assessment.

## Workspace upgrade — 17 October 2026

Direction: a compact field-operations desk. A dark ink navigation rail anchors a warm, light work surface. Thin rules, small numbered labels, a clear typographic hierarchy, and a restrained teal action color organize the work. Avoid decorative dashboards, invented metrics, gradients, shaders, and animation of static stock values.

### Current references and decisions

The six existing reference notes were refreshed against their original sites. Minimal Gallery informs whitespace and hierarchy. Search System informs clear labels and an index-like navigation rail. Uncut Sans was selected from Uncut's catalogue and its original author repository; self-host the variable WOFF2 with the original SIL OFL license. tweakcn informs semantic light/dark tokens, without adding shadcn. Paper Shaders and Number Flow were reviewed; this task does not need either dependency. DialKit and Design for B2B were unavailable in the documentation browser; do not claim their visual examples were inspected.

### Screen and workflow constraints

- Navigation: Field reports, Product lookup, Reference inventory. Preferences use a native modal dialog. Show active location and clear keyboard focus.
- Field reports: report composer, fictional scenario picker, keyboard submission, cancel/retry, structured result tabs, personal information checklist, copy summary, JSON copy/download, and session-only report history.
- Product lookup: explicit barcode lookup, public product identity, dated store price observations, source links, fetch/source dates, empty/partial/error states, and visible stale-price labels. This is independent of assessment evidence. Never imply public prices establish stock or authorize a price change.
- Preferences: system/light/dark appearance, comfortable/compact spacing, and initial result view. Persist preferences only. Report contents and history stay in memory for this tab; no automatic browser storage of reports.
- No invented connection, completion, accuracy, revenue, or productivity metrics. Counts must derive from fixtures or this session's actions. Human review remains advisory.

### Implementation values

- Typography: self-hosted Uncut Sans, 14–15px body/1.55, 30–36px main title, 20–23px panel title, 11px mono labels. System monospace for IDs and JSON. No remote font requests.
- Light tokens: canvas `#f5f6f2`, panel `#ffffff`, text `#192b25`, muted `#65726b`, border `#dde3dc`, accent `#246b55`. Rail `#172e26`, rail text `#e6eee8`. Amber and red always include text labels.
- Dark tokens: canvas `#14221c`, panel `#1c2d25`, text `#eef4ef`, muted `#a4b6a9`, border `#34483b`, accent `#94d4b1`. Keep warning/error text contrast readable.
- Layout: rail 224px above 1100px; main content up to 1240px. Composer/result use 0.9fr/1.1fr columns above 1000px. Stack below that width. Main gutters 32px desktop, 16px mobile.
- Geometry: 4px spacing base, with 8/12/16/20/24/32px increments. Panels 12px radius; controls 7px. Use border hierarchy instead of decorative shadows. Modal backdrop may dim the page.
- Controls: at least 44px touch target; explicit labels, native buttons/inputs/selects, visible focus. Tabs support arrow/Home/End navigation. Dialog traps focus with native `showModal`, closes on Escape, and restores focus.
- Feedback: inline accessible status, clearly labelled model fallback, cancellation, stale prices, and pending activity. No fake progress percentages. Never expose credentials or upstream error bodies.
- Motion: color/opacity transitions up to 140ms; honor reduced motion. No continuously animated decorations.

These constraints replace the starter's 960px width and system-font choices for the upgraded workspace. Keep the assessment's seven-field output and fictional inventory contract intact.
