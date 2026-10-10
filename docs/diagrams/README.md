# SalesEasy runtime diagrams

The drawings show the implemented system at two levels, without source-file paths:

- **Network diagram**: browser, routes on the same Next.js server, in-process SDK, external DeepSeek API, local inventory and server-held credentials.
- **Request/response flow**: JSON payload, strict input validation, matched inventory context, model extraction and tailored assessment, completion/schema/evidence validation, mandatory decision checks, seven-field response, and HTTP error returns.

Open `sales-copilot-architecture.excalidraw` in Excalidraw to edit both drawings on one canvas. Individual editable scenes, SVGs and PNG previews are included. These previews were rendered locally with hand-drawn strokes.

The live Excalidraw canvas now contains the updated high-level network and detailed request flow. The previous extraction-only drawing was replaced with the current scene. The canvas contains 76 editable elements. `sales-copilot-browser.excalidraw` saves those current browser elements, excluding deleted history.

The updated arrows show both the report and matched stock going to DeepSeek. Its response includes extraction and a tailored assessment. Backend checks validate the proposal before the frontend displays the seven-field JSON. The detailed flow includes invalid input, model failure, timeout, and rejected-proposal paths.

See [the updated live canvas capture](excalidraw-live-updated.png). The browser was left on the network diagram at a readable zoom. Both diagrams remain on the same canvas.

Solid arrows are the normal flow. Dashed arrows return errors to the browser. Invalid input returns an error body; provider/model failures return a validated seven-field human-review result with a non-200 status. Inventory is a fictional fixture, and review is advisory.

Checked against the current route handlers, model client, response parser, policy and browser submission logic. No database, separate gateway, multi-agent service or operational approval queue is represented.
