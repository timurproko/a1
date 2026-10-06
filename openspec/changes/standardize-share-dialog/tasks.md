## 1. Standard share operation dialog

- [ ] 1.1 Implement a bare-A1 share operation component with the shared modal frame, `Share` title, animated gist progress, one abort signal, and semantic cancel shortcuts; verify focused component tests cover title/rule adjacency, one-cell alignment, key/action styling, direct hint-to-bottom-rule placement, narrow widths, and each cancellation key.
- [ ] 1.2 Select the owned share dialog only for the custom bare-A1 viewport while retaining the pinned loader in `a1 pi`; verify session-shell tests cover both active presentations and focus/editor restoration after success, failure, and cancellation.

## 2. Native successful-share links

- [ ] 2.1 Apply the existing native web-link presentation to successful bare-A1 dock status rows so both generated URL values are blue bounded OSC 8 links while labels keep status styling; verify focused tests assert exact viewer/gist targets, row order, display-width bounds, and no decoration of ordinary non-link status text.
- [ ] 2.2 Preserve terminal-owned dashed idle decoration, solid hover underline, and Ctrl+click activation without application pointer interception; verify automated link semantics and record manual supported-terminal evidence for both generated links.

## 3. Integration validation

- [ ] 3.1 Run typechecking and the focused component, session-shell, hyperlink, input-surface, and modal-governance tests selected by the implementation; record results and dispose any discovered gap before handoff.
- [ ] 3.2 Build the interactive candidate and manually verify `/share` loading, cancellation, successful viewer/gist link appearance and Ctrl+click opening, narrow-terminal layout, and unchanged `a1 pi` presentation; record implementation evidence and any known gap before finalization.
