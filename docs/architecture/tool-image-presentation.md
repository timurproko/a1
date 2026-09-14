# Owned tool image presentation

## Why this source adaptation exists

The accepted `preserve-agent-content-rendering` design permits a minimal attributed content adaptation when the pinned public component cannot preserve supported behavior. The user explicitly approved this image-lifecycle adaptation after its failing baseline.

Pi 0.84.2's `ToolExecutionComponent` stores converted images by array index. Replacing a JPEG with another JPEG or a PNG can therefore display the previous pixels. Conversion failure has no visible fallback under Kitty. Its public API exposes neither conversion-cache reset nor mount disposal. Reconstructing the entire component on each attachment change would discard extension renderer state and asynchronous previews.

`src/integrations/pi/components/upstream/components/tool-execution.ts` retains that tool shell's composition, lifecycle, fallback, expansion and extension context. Actual built-in renderers still come from the public `create*ToolDefinition` factories; custom renderers receive the original content, MIME types, bytes, details, arguments, state and previous components. The owned shell never edits installed Pi, accesses private fields, patches prototypes, upgrades dependencies, or modifies the explicit Pi comparison route.

The source unit is from MIT-licensed repository <https://github.com/earendil-works/pi>, commit `914cf1472e715297caa30db4b9535d534a9eb718`, path `packages/coding-agent/src/modes/interactive/components/tool-execution.ts`. The source-map hash and local port hash are recorded in `config/baselines/pinned-pi-source-port-ledger.json`. Its small generic-output helper follows `core/tools/render-utils.ts::getTextOutput` and `utils/shell.ts::sanitizeBinaryOutput` from the same package; Node's public `stripVTControlCharacters` replaces the private ANSI helper. The public definition factories replace the private `createAllToolDefinitions` lookup. Public theme and TUI imports are mapped to the existing owned boundaries. No tool filesystem implementation or renderer layout is copied.

## Image ownership and bounded work

`ToolImagePresentation` owns only current image presentation. It shares immutable source strings rather than copying or hashing accumulated image data per chunk. Equal current sources share a conversion entry; entries disappear when their source is removed. The existing admission limits remain 16 references and 20 MiB per image; derived PNGs also receive the per-image limit before retention.

One conversion is active per mounted tool. The waiting set is the newest current source set, not an unbounded queue of superseded snapshots. Hidden images and non-Kitty protocols do not start conversions. Work removed before codec entry is skipped. A public codec call already in progress cannot be cancelled; its eventual result is discarded if the source or mount is obsolete. This limitation is explicit, not claimed as cancellable worker execution.

Pending Kitty conversion has a visible `[Image converting: ...]` marker. Failure, rejection, or oversized converted bytes produces `[Image unavailable: ...]`, without exposing codec diagnostics or changing the operation outcome. Converted pixels never replace the original payload passed to extension renderers. PNG and iTerm presentation use the actual public `Image` component. Hidden and no-image-capability text presentation matches pinned Pi.

Rebuild/disposal releases image ownership and invalidates the previous mount. Reentrant renderer invalidation is suppressed during synchronous reconstruction; valid asynchronous callbacks still request the existing scheduler and update presentation revision, not semantic revision.

## Terminal row boundaries

Kitty APC payloads are zero-column opaque controls, not displayable base64 text. Neutral width/truncation/copy handling preserves or excludes the complete control as appropriate. Rail overlays preserve each image transfer once rather than replaying it as an SGR style. The runtime width guard excludes complete Kitty payloads but still checks all ordinary columns around them; it does not exempt an arbitrary image-bearing row from width validation.

This correction does not introduce an ANSI parser, change link detection, relax text width limits, or change terminal erase policy. Image placement, scaling and clipping remain subject to the existing public Image and viewport visibility policies; physical partially clipped-image behavior is not established by a component byte comparison.

## Evidence

- `transcript-image-conversion.test.ts`: independent pinned stale-cache baseline, JPEG replacement, PNG replacement, hidden/non-Kitty parity, failed-conversion fallback and real scheduled Kitty publication at unchanged semantic revision.
- `tool-image-presentation.test.ts`: current-source sharing, one active conversion, superseded bursts, removed/disposed callbacks, hidden/iTerm work avoidance, rejection and size fallback without retry loops.
- `tool-shell-parity.test.ts`: independent actual pinned read/bash/edit/write/grep/find/ls and generic rendering at widths 40/80/192, partial/final/error states, expansion, binary text, and extension default/self shells with original inputs and stable renderer state.
- Existing attachment-ownership, payload-limit, content-retention and shell tests remain non-regression gates. The wrapped-URL counterexample remains explicitly unresolved under issue #353.

These are automated content and ownership checks, not Windows Terminal visual acceptance. The broader change stays open until scheduled-producer evidence, required CI, and exact-candidate user review satisfy its remaining tasks.

## Upstream license notice

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
