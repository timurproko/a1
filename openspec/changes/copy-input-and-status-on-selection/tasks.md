# Tasks

## 1. Classify copyable dock text

- [ ] 1.1 Add focused viewport regressions for prompt-only, status-only, mixed, reverse, partial-column, wrapped, whitespace, and excluded-chrome selections; verify the cases distinguish eligible ordinary prompt/status rows from autocomplete, borders, widgets, notices, progress, and alignment rows.
- [ ] 1.2 Extend dock composition and viewport anchors with structural ordinary-prompt and footer/status copy ranges for full and dock-only composition; verify viewport tests preserve eligibility across input reflow, resize, footer updates, and retained-selection reprojection.
- [ ] 1.3 Apply the same eligible-row extraction to automatic release and explicit `Ctrl+C` snapshots while retaining normalization and bounds; verify viewport tests return exact prompt/status payloads and preserve existing transcript semantics.

## 2. Copy editor-owned prompt selections on release

- [ ] 2.1 Add owned-editor and controller regressions for word/line multi-click completion, single clicks, exact expanded text, disabled auto-copy, and frame-drag ownership; verify each completed gesture yields zero or one expected snapshot without collapsing selection.
- [ ] 2.2 Extend the owned editor pointer contract to expose immutable selected semantic text on release and route it through the controller only when copy-on-select is enabled; verify keyboard copy/cut and explicit disabled-mode `Ctrl+C` behavior remain unchanged.

## 3. Integrate shell delivery and feedback

- [ ] 3.1 Wire prompt and status automatic snapshots into the existing shell copy coordinator and acknowledgement path; verify focused shell tests cover prompt-only, status-only, and mixed transcript/prompt/status payloads under enabled and disabled live settings.
- [ ] 3.2 Preserve exclusion, ownership, and profile boundaries; verify focused shell tests show no duplicate submissions, no copy for whitespace or chrome, unchanged `/copy` and keyboard prompt copy/cut, and no behavior change in `a1 pi`.

## 4. Complete implementation evidence

- [ ] 4.1 Run the focused editor, viewport, controller, and shell selection tests plus typechecking and strict OpenSpec validation; record the implementation evidence and any reviewed known-gap disposition for finalization.
