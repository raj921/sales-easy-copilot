# SalesEasy runtime diagrams

The drawings show the implemented system at two levels, without source-file paths:

- **Network diagram**: browser, routes on the same Next.js server, in-process SDK, external DeepSeek API, local inventory and server-held credentials.
- **Request/response flow**: JSON payload, strict input validation, outbound model request, completion/schema/quote validation, inventory lookup, policy, final response and HTTP error returns.

Open `sales-copilot-architecture.excalidraw` in Excalidraw to edit both drawings on one canvas. Individual editable scenes, SVGs and PNG previews are included. These previews were rendered locally with hand-drawn strokes.

Both diagrams were also inserted into the live Excalidraw canvas through its native Mermaid tool using Ego Browser. The insertion was verified as 87 new editable elements, and the canvas was switched to light mode. `sales-copilot-browser.excalidraw` contains those native elements, excluding the pre-existing unrelated drawing. Layout cleanup paused when the user took browser control; spacing from the previous drawing remains unfinished.

Solid arrows are the normal flow. Dashed arrows return errors to the browser. Invalid input returns an error body; provider/model failures return a validated seven-field human-review result with a non-200 status. Inventory is a fictional fixture, and review is advisory.

Checked against the current route handlers, model client, response parser, policy and browser submission logic. No database, separate gateway, multi-agent service or operational approval queue is represented.
