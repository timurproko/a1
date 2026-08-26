# A1 UI reference provenance

The A1 UI component layer is ported from an existing A1-authored reference implementation
rather than reinvented. Rebuilding a screen from screenshots reproduces its shape but not its
decisions, and the decisions are where the work is: column arithmetic, sticky-header
reservation, block-jump targets, span overlay under styling, and pointer hit regions.

This file records what came from where, so a divergence can be judged against its source
instead of argued from memory. It is the same discipline as
[`terminal-host-provenance.md`](terminal-host-provenance.md), applied to UI source.

## Source

A1 UI reference implementation, local working copy. The reference is a Pi extension built on
its own `core` facade layer; A1 is a product, so the port adapts imports and keeps behavior.

## Ported units

| A1 module | Reference unit | Adaptation |
| --- | --- | --- |
| `ui-components/line-input.ts` — word motion and word delete | `core/panes/line-input.ts` | `wordLeft`/`wordRight` and their key bindings ported verbatim, including deciding a word delete before a plain one because a raw backspace byte is ctrl+backspace on Windows Terminal. |
| `ui-components/spans.ts` — span painting | `core/presentation/spans.ts` | Uses A1 `displayWidth`; hyperlink/style replay and background-only selection painting preserve each source foreground plus bold, underline, links, and other attributes. |
| `ui-components/text-selection.ts` | `core/panes/text-selection.ts` and `ui/agent-view/content-selection.ts` | Keeps LMB drag, double-click word, triple-click line, grapheme-aware extraction, and prompt decoration exclusion. Multiline selection uses native terminal geometry (first-row tail, complete middle rows, last-row head); triple-click paints the full row while copied text remains semantic content. |
| `ui-components/scrollbar.ts` — geometry | `core/presentation/scrollbar.ts` — `scrollbarGeom` | Same formula; A1 names the fields and returns null rather than undefined. |
| `ui-components/scrollbar.ts` — rails | `core/presentation/scrollbar.ts` — zone, policy, and hover/drag state | Rail identity, hover reservation, activity linger, visual weights, drag, and track paging kept; A1 holds state in an instance rather than a module global, while the session shell applies profile-local normal/fast wheel and selection-edge speed. |
| `ui-components/submitted-prompt.ts` | `core/presentation/user-bar.ts` | Keeps the compact `❯ ` prefix, continuation indentation, timestamp reservation, and right alignment. A1 fixes the declared format to local 24-hour `HH:mm` and uses the engine's source timestamp. |
| `ui-components/transcript-viewport.ts` | `ui/agent-view/render.ts`, `scroll.ts`, `state.ts`, and `feature.ts` | Keeps follow/detach transitions, the floating bottom control, semantic sticky prompt behavior, and the session rail's intentional one-row top inset. New-message counts follow the reference's exact completed-assistant-message boundary, exclude tool results, and reset when input or a fresh agent run resumes follow mode. `Working` stays pinned only while all content fits; on overflow it joins the scrollable document tail exactly like the reference. A1 receives owned rows, prompt anchors, and semantic lifecycle events instead of inspecting Pi children. |
| `ui-components/list-block.ts` — block navigation | `settings/impl.ts` — `blockJumpTarget`, `blockRowSpan`, `bottomBlockTarget` | Row type generalized from settings rows to a grouped list; targets and edge behavior identical. |
| `ui-components/list-block.ts` — sticky scroll | `settings/impl.ts` — `stickyHeaderGroup`, `topPaddingRows`, `visibleRowCountAt`, `clampScrollForView` | Same reservation arithmetic and two-pass reveal. |
| `ui-components/mouse.ts` | `core/panes/sgr-mouse.ts` | Same SGR decoding and per-call regex reset; A1 emits its own event shape. |
| `ui-components/mouse.ts` — tracking sequences | `core/host/pi/providers/host-bridge-surface.ts` | Mouse modes only. A1 does not take the alternate screen, because the Pi TUI owns the screen A1 renders through. |
| `features/owned-ui/settings-app.ts` — layout | `settings/impl.ts` — `settingsValueColumn`, `renderFieldLine`, footer and search rendering | Setting discovery is A1's own section model; presentation follows the reference. |

## Ported from the pinned engine

| A1 module | Pinned Pi source | Adaptation |
| --- | --- | --- |
| `pi-engine-adapter/settings-integration.ts` — `SETTING_LABELS` | pinned Pi settings selector | Labels and descriptions transcribed so an owned screen reads as the vanilla route words it. Ids are mapped from the selector kebab-case to the exposed camelCase keys. |

## Deliberate differences

- **No alternate screen.** The reference owns its surface and can switch screens; A1 renders
  through the pinned Pi TUI, so an owned screen is a full-viewport overlay instead.
- **Colour is a port, not an import.** The reference takes a Pi `Theme` directly. A1 defines
  `UiTheme` so the component layer never imports a Pi adapter and can be rendered plainly in
  tests.
- **Settings content.** The reference aggregates per-extension settings files; A1 has one
  section for its own settings and one for the agent's, read through the engine settings port.
- **No viewport prototype or child-tree patches.** `ui/agent-view/user-prompt.ts` and the
  private-child traversal in `ui/agent-view/render.ts` were analyzed only for behavior. The
  destination renders source timestamps through an owned transcript adapter and derives sticky
  anchors while assembling semantic transcript blocks; it never replaces a Pi prototype or
  reads a Pi component's private children.

## Keeping this honest

When a ported unit is changed, either change it to match the reference or record here why it
diverges. An undocumented divergence is the thing this file exists to prevent.
