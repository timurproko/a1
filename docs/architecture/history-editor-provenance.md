# History editor source boundary

The history-enabled default editor is derived from Pi 0.84.2 at commit
`914cf1472e715297caa30db4b9535d534a9eb718`, repository
<https://github.com/earendil-works/pi>. The approved scope is
`openspec/changes/add-persistent-prompt-history/design.md`, decision 2a.

## Source and import inventory

The owning directory is `src/integrations/pi/components/upstream/history/`.

| Owned unit | Upstream source under `packages/tui/src/` | Retained behavior |
|---|---|---|
| `editor-core.ts` | `components/editor.ts` | Editor state machine, layout, history boundaries, paste backing, autocomplete, undo integration |
| `kill-ring.ts` | `kill-ring.ts` | Kill/yank accumulation and rotation |
| `undo-stack.ts` | `undo-stack.ts` | Clone-on-push undo storage |
| `word-navigation.ts` | `word-navigation.ts` | Word/atomic-segment navigation |
| `text-helpers.ts` | selected declarations in `utils.ts` | Shared local segmenters, CJK break classification, punctuation/whitespace predicates only |
| `printable-key.ts` | selected declarations in `keys.ts` | Pure modifyOtherKeys printable helper and modifier constants; delegates Kitty decoding to the public export |

All reusable terminal APIs come from `#pi-tui`: keybinding state, `matchesKey`,
`decodeKittyPrintable`, `CURSOR_MARKER`, width/slicing, `SelectList`, and public
component/autocomplete types. No terminal runtime, parser stack, terminal
renderer, package loader, or dependency copy is introduced. The terminal-package
alias and exported constructors remain unchanged.

`node scripts/pi/extract-history-editor-source.mjs` resolves the terminal package
from pinned Pi's entry and extracts references and hashes into the ignored
`.artifacts/history-editor-upstream/` directory. It never overwrites owned code.
The source ledger records upstream and owned destination hashes. Source maps are
used only by provenance tooling, not by the shipped runtime. Changed source must
be explicitly reconciled, not automatically adopted in an engine upgrade.

## Owned changes and collaborator boundaries

The core uses public imports, a distinct `HistoryEditorCore` class, and strict
TypeScript declaration adjustments. Persistent history is opt-in: its typed
snapshot installation and observation methods preserve input and undo state,
freeze an active browse cycle, and change caret placement only in that mode.
The editor renders position/overflow in its existing border. The position label
uses an injected neutral status-text style (`dim`), while the surrounding rules
retain the active input-border color, as clarified during manual review. The approved
`show-autocomplete-above-prompt` review refinement omits the literal `History` title:
`─── 1/100 ─…` keeps the same four-cell inset, count calculation, dim color, optional
scroll-overflow suffix, and clipping. Core and shell regressions verify numbering,
100-entry recall, draft restoration, and the absence of the title. Recall temporarily
separates the draft's live paste backing from recalled literal text, restoring it
on return; ordinary pinned mode remains source-equivalent.

The integration inventory is:

- `shell-editor-autocomplete.ts`: choose the default editor through a typed
  component interface, never cast the owned core to the concrete Pi editor.
- `upstream/components/owned-editor.ts`: retain its pinned-based comparison and
  disabled-history route; share app actions and owned prefix/suggestion behavior
  through typed composition for the history-enabled route.
- `owned-editor-ux.ts`: selection, atomic segmentation, visual-line geometry,
  provisional paste completion, and undo repair need a typed owned collaborator
  boundary. Existing compatibility access on the pinned route is not permission
  for new private access on the owned core.
- `shell-extension-ui.ts`: public text, shortcut, autocomplete, and factory
  behavior remain extension-owned. A custom editor is not patched for recall.
- `session-shell-root.ts` and `session-shell.ts`: deliver semantic snapshot and
  submission events; they must not own a second history index, mutable draft,
  undo stack, or rendered-border parser.

`test/integrations/pi/components/history-editor-core.test.ts` independently runs
real pinned and owned editors against the same input tapes, comparing rows,
text/expanded text, cursor, autocomplete, and submissions. Separate fixtures
cover v2 directional placement and numbering, deferred snapshots, draft/undo
restoration, and literal paste-marker collisions. This is editor-core evidence,
not acceptance of the complete persistent-history feature.

## License

Upstream license at the recorded commit:

```text
MIT License

Copyright (c) 2025 Mario Zechner

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
