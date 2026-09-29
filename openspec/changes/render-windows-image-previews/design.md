## Context

See `proposal.md` for motivation. Bare A1 already projects each submitted user image into a payload-free transcript reference, retains the immutable attachment in `TranscriptImageAssets`, resolves it for the mounted block, and appends Pi TUI's public `Image` component below the submitted prompt. The attachment/model path is therefore intact; the failure is presentation.

Pi TUI 0.87.1 detects WezTerm as Kitty-capable and Windows Terminal as having no image protocol. Its fullscreen renderer includes an initial WezTerm clear-before-placement repair, but a later write to any row covered by an unchanged Kitty placement can still erase those image cells. This matches the reported blank reserved region and the remaining reproduction documented in upstream issue `earendil-works/pi#9169`. Windows Terminal intentionally receives Pi's textual `[Image: …]` fallback.

The user-provided `pi-imgcat` package is useful evidence but is not a drop-in solution. Its command/tool emit ordinary Pi image content on native paths; on Windows it uses Sixel through an optional external PowerShell module and then falls back to ANSI half-block art. Installing that package would not replace bare A1's submitted-user-image presenter, and requiring its machine-level module would make core behavior depend on unowned software. Its late-row Sixel composition demonstrates that raw DCS survives Windows ConPTY and can coexist with Pi's row model. A1 will own that presentation path and use a bundled in-process encoder instead of invoking the module.

## Goals / Non-Goals

**Goals:**
- Show a recognizable submitted-image preview in bare A1 on Windows WezTerm and Windows Terminal.
- Avoid Kitty/iTerm transport on Windows for this submitted-image surface when it can yield blank or unstable rows.
- Keep decoding and scaling off the interactive thread and keep rendering work finite.
- Preserve the original attachment and every existing prompt, model, history, visibility, and lifecycle contract.
- Produce deterministic protocol/row evidence plus exact-candidate physical terminal review.

**Non-Goals:**
- Install, vendor, or execute `pi-imgcat`, the PowerShell `Sixel` module, or another external renderer.
- Add Sixel encoding to A1 in this change.
- Change tool-result image rendering, extension-owned custom renderers, prompt chips, image preparation quality, or provider payloads.
- Repair upstream Pi globally, patch installed package files, or change the explicit `a1 pi` comparison profile.
- Promise photographic fidelity equal to a terminal-native pixel protocol.

## Decisions

### 1. Select submitted-image presentation explicitly at the bare-A1 boundary

Introduce an A1-owned presentation policy for retained user transcript attachments. Reliable non-Windows image-capable environments continue to use Pi TUI's public `Image` component. Bare A1 on known Sixel-capable Windows Terminal and WezTerm hosts uses an A1-owned Sixel preview whether Pi reports `kitty` or no image protocol; unknown Windows hosts use bounded text cells. This avoids the APC placement that disappears in Windows WezTerm and the metadata-only result in Windows Terminal while retaining a safe protocol-free fallback.

The policy is explicit and independently testable from platform, shell route, visibility setting, and terminal capabilities. It applies only to the bare-A1 submitted-user-image surface. `a1 pi` and installed Pi retain their detected protocol and renderer unchanged.

Switching only Windows WezTerm from Kitty to iTerm2 was rejected because `pi-imgcat` records that native ConPTY can filter both transports, and it would not improve Windows Terminal. Generic terminal-version allowlisting remains rejected; Sixel is selected only for the two Windows host families under acceptance, both of which support it, and the protocol-free fallback remains available elsewhere.

### 2. Generate a bounded high-density ANSI preview off-thread

Extend the owned image worker boundary with a preview operation that decodes the retained prepared attachment, scales it to a finite cell budget while preserving aspect ratio, and returns presentation rows rather than image bytes. Each cell samples a 2×2 pixel group and maps its two-color partition to a Unicode quadrant glyph with bounded truecolor foreground/background sequences. This doubles horizontal sample density over half-block art without increasing terminal columns or rows. Transparent samples use a defined theme-safe treatment rather than leaking uninitialized pixel values.

The requested width is clamped by the current transcript image-width setting, available component width, and a fixed maximum. Height, decoded pixels, output rows, and encoded terminal bytes also receive fixed limits. The worker returns only bounded rows or a classified unavailable result; raw codec diagnostics and image bytes never enter notices, logs, or tests.

Main-thread decoding was rejected because screenshot conversion can suspend input and streaming. The first implementation rejected Sixel because A1 had no owned encoder, but physical Windows Terminal review showed that even bounded cell art was too coarse for text-heavy screenshots. The revised design adds a bundled JavaScript encoder inside the existing worker and retains cells only as the protocol-free fallback. A metadata-only fallback remains rejected because that is the reported Windows Terminal deficiency.

### 3. Compose Sixel after its reserved rows

For a Sixel result, reserve a bounded number of transcript rows and carry the DCS sequence on the final reserved row, moving the cursor back to the preview origin immediately before transmission. This follows the proven `pi-imgcat` row-order technique: ordinary clears and placeholders paint first, then the image paints over them. Source alpha is composited in the worker and the DCS requests transparent background handling so Windows Terminal does not apply its device-dependent solid background fill over the encoded palette. The sequence is produced and size-checked in the worker, validated again at the adapter boundary, and never interpreted as model or transcript text. Later settled rendering, scrolling, resizing, hiding, or remounting either retains or regenerates the lifecycle-owned result.

Directly returning Sixel on the first reserved row was rejected because subsequent row clears can erase the just-painted pixels. A machine-installed encoder and subprocess were rejected because core preview behavior must ship with A1.

### 4. Tie preview work to mounted attachment identity and lifecycle

A mounted submitted-image presenter starts at most one conversion at a time, queues only its current unresolved attachments, and caches completed rows by stable retained asset identity plus effective width/theme inputs. A width or relevant presentation change invalidates the derived rows without duplicating the original base64 payload. Removal, block replacement, session replacement, or disposal prevents late completion from repainting a newer surface.

While conversion is pending, the transcript shows a bounded preparing marker instead of silent blank rows. A decode failure, unsupported image, deadline, cancellation, or output-bound violation produces the existing safe unavailable/metadata-style fallback and leaves surrounding prompt content visible. Hidden images start no preview work and retain `[Image hidden: …]` behavior.

Reusing prompt-paste preparation state was rejected because persisted/restored transcript assets and current-session clipboard jobs have different ownership and lifetimes.

### 5. Keep attachment semantics and comparison behavior unchanged

Preview generation reads the retained prepared attachment but never replaces it. Original MIME type and base64 continue to drive stored session content and model delivery. Screenshot chip labels, submitted prompt text, resize guidance filtering, history sidecars, image count/size limits, and coordinate mapping remain unchanged.

The fallback is presentation-only. It does not claim a new attachment was created, does not send ANSI rows to the model, and does not alter image visibility settings. The explicit `a1 pi` route remains the independent pinned comparison and receives no A1 fallback.

### 6. Prove both semantic output and terminal behavior

Focused worker tests will cover Sixel framing/size, aspect preservation, cell fallback color pairing, transparency, malformed input, width/height/output limits, cancellation, and payload-free failures. Presenter tests will cover host selection, pending/ready/unavailable/hidden states, width changes, stale completion, disposal, and original-attachment identity. Terminal evidence will assert known Windows hosts receive one bounded Sixel DCS after reserved rows, unknown Windows hosts receive bounded ordinary cells, neither path emits Kitty image transmission/placement, iTerm OSC 1337 image, or base64 payload, and reliable native and `a1 pi` fixtures remain unchanged.

Automated evidence cannot establish actual host colors or readability. Acceptance therefore includes the exact built candidate in current Windows WezTerm and Windows Terminal, checking initial paint, later status/assistant updates, scrolling away/back, resize, hidden-image mode, and continued input responsiveness.

## Risks / Trade-offs

- **[ANSI previews have lower fidelity than native pixels]** → Prefer bounded Sixel on accepted Windows Terminal and WezTerm hosts; retain two-color 2×2 quadrant samples only for unknown Windows hosts. Manual Windows Terminal evidence rejected the initial 1×2 half-block output as too coarse for text-heavy screenshots.
- **[Large screenshots can consume CPU or terminal bytes]** → Decode in the existing bounded worker infrastructure and cap input, decoded pixels, cells, rows, output bytes, concurrency, and deadline.
- **[The synchronous mounted lifecycle adds startup code]** → Accept one small adapter module in the startup graph while keeping codecs and conversion logic worker-only.
- **[Theme or transparency can make content unreadable]** → Define deterministic transparent-pixel handling and regenerate theme-dependent rows when required.
- **[Late conversion can repaint stale content]** → Bind completion to mount, asset, width, and session identities and discard superseded results.
- **[A future Pi/WezTerm release repairs native Windows placement]** → Keep protocol selection isolated so a later evidence-backed change can restore native rendering without changing attachment projection.
- **[Tool images remain subject to their existing Windows behavior]** → Keep this request scoped to screenshots the user submits; do not silently expand into extension/tool renderer ownership.

## Migration Plan

1. Add the platform/route/capability presentation policy and the bounded worker request/result contract.
2. Add the lifecycle-owned submitted-image presenter and integrate it where bare A1 currently appends user transcript images.
3. Add focused conversion, presenter, protocol, comparison, and terminal-paint evidence.
4. Build and physically review the exact candidate through `./scripts/dev` in Windows WezTerm and Windows Terminal.

Rollback removes the Windows fallback selection and derived preview worker path; original transcript attachments and persisted sessions require no migration.
