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
| `ui-components/spans.ts` — `overlaySpan` | `core/presentation/spans.ts` | Uses A1 `displayWidth`; hyperlink and style replay kept verbatim. |
| `ui-components/scrollbar.ts` — geometry | `core/presentation/scrollbar.ts` — `scrollbarGeom` | Same formula; A1 names the fields and returns null rather than undefined. |
| `ui-components/scrollbar.ts` — rails | `core/presentation/scrollbar.ts` — zone and hover state | Rail identity kept; A1 holds state in an instance rather than a module global. |
| `ui-components/scrollbar.ts` — appearance and weight | `ui/scroll-bar/policy.ts`, `ui/scroll-bar/feature.ts`, and `ui/scroll-bar/settings.json` | Ports always/hover/hidden visibility, activity linger, drag latch, the connected `│` track with `│`/`┃` thumb weights, and the user-selected wheel-distance concept. A1 keeps the existing shared geometry and declares bounded normal/high distances of three/six lines rather than inheriting prototype-specific values. |
| `ui-components/transcript-viewport.ts` — follow/detach and controls | `ui/agent-view/state.ts`, `ui/agent-view/scroll.ts`, and `ui/agent-view/render.ts` | Ports follow-tail, detached stability, bottom control, sticky prompt semantics, and hit regions into a vendor-neutral exact-frame component. Prompt anchors arrive from semantic A1 blocks instead of a Pi child index. |
| `ui-components/transcript-viewport.ts`, `ui-components/text.ts` — transcript selection | `ui/agent-view/content-selection.ts` and `ui/agent-view/selection-paint.ts` | Ports visible-to-document row mapping, grapheme-aligned LMB drag ranges, ANSI-safe highlight overlay, and plain-text extraction. A1 limits this adaptation to transcript rows and sends completed selections through its runtime OSC 52 bridge; editor-selection prototype patches are not ported. |
| `pi-components/shell-presenters-transcript.ts` — submitted prompt timestamp | `ui/agent-view/user-prompt.ts` | Ports local `HH:mm`, first-row reservation, and narrow-width omission as an owned component wrapper; no prototype is patched. |
| `pi-tui-runtime/adapter.ts` — viewport pre-input | `ui/agent-view/feature.ts` | Preserves the requirement that viewport wheel input wins before Pi fullscreen scrolling, but implements it as an A1 terminal bridge stage rather than listener/prototype patching. |
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
- **No private transcript tree.** The prototype recognizes Pi constructors and reads private
  children to recover user prompts. A1 records row anchors while it renders known transcript
  block ids and kinds, so upgrades fail at public component/runtime boundaries rather than at
  hidden tree shape.
- **No prototype mutation.** The prototype patches user-message rendering and Pi input methods.
  A1 composes timestamped rows and pre-routes terminal input through owned ports; installed Pi
  classes and distribution files remain untouched.

## Keeping this honest

When a ported unit is changed, either change it to match the reference or record here why it
diverges. An undocumented divergence is the thing this file exists to prevent.
