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
