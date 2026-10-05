## 1. Shared session reference document

- [x] 1.1 Extend sectioned reference documents with optional preamble rows and verify title, preamble, separator, grouped-row, sticky-header, narrow-frame, and unchanged no-preamble Hotkeys behavior in focused app tests.
- [x] 1.2 Keep the pinned in-feed session presenter unchanged and add a lazily loaded width-aware screen formatter that reuses shared warming/token helpers; verify parity for complete text, styles, indentation, wrapping, economics, conditional Cost, and no-name cases.
- [x] 1.3 Add a session reference provider that emits identity preamble rows and `Messages`, `Tokens`, `Cache Warming`, and conditional `Cost` sections; verify every section uses plain semantic titles for the shared group-header renderer and remains outside the eager startup graph.

## 2. Full-screen session route

- [x] 2.1 Add the `session` owned route identity and provider contract, execute the existing session workflow once per route opening, and verify successful, malformed, and failed snapshots settle through the deferred surface without appending workflow output.
- [x] 2.2 Wire the bare-A1 composition provider and verify `/session` opens the full-screen `Session Info` route with current values, clears the editor, leaves the feed unchanged, supports all reference-screen scrolling and close paths, and refreshes values after reopening.
- [x] 2.3 Preserve the comparison boundary and verify `a1 pi` continues to render the pinned session report chronologically in the feed with no owned screen.

## 3. Ownership and validation evidence

- [x] 3.1 Update the feature-adoption matrix and presenter-ownership inventory for the bare-A1 full-screen divergence; verify governance tests map `/session` to the session-info presenter and retain the comparison destination.
- [x] 3.2 Run focused reference-app, route-host, shell, presenter, workflow, and governance tests plus source typechecking, strict OpenSpec validation, changed documentation checks, and architecture checks; record concrete results and any environment-only gap in this change before handoff.
- [x] 3.3 Build the interactive candidate and provide a color-preserving `./scripts/dev` manual check for title, yellow section headers, report completeness, scrolling, close/restoration, and absence of transcript output.
