# Design

## Scope

Treat `showImages=false` as a presentation-only omission for automatic user and tool-result attachment blocks. Keep inline screenshot chips and ordinary text unchanged. Extension-supplied text is not an automatic attachment fallback and must not be filtered.

## Approach

For non-tool transcript blocks, skip attachment composition before adding image spacers or resolving hidden assets. For owned tool execution, stop synthesizing textual image indicators while hidden; retain original tool results for renderers and the engine. Existing image presentation lifecycle handles visibility changes and re-enabling without discarding retained bytes.

The canonical `pi-settings-runtime` requirement currently requires hidden-image diagnostics; this change intentionally replaces that rule, not the diagnostics for enabled rendering failures. Unsupported-terminal behavior is already omission and remains unchanged.

## Coverage

- Existing and newly submitted user images while hidden, with screenshot chips and ordinary text retained.
- Tool results with text plus images, multiple images, and image-only results, without automatic image labels or image-only gaps.
- Live enabled-to-hidden-to-enabled transitions and protocol-capable versus unsupported terminals.
- Retained session/model attachments and enabled-image failure diagnostics remain unchanged.

Use focused owner-level tests, typecheck, and strict OpenSpec validation during approved implementation; required CI remains post-readiness authority.

## Known gaps

None identified in the proposed scope. Actual terminal-host observation is optional and does not block implementation completion. This change does not remove image metadata written deliberately by users or custom tool renderers.
