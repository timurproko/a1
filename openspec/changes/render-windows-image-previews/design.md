## Context

See `proposal.md` for motivation. Bare A1 already projects each submitted user image into a payload-free transcript reference, retains the immutable attachment in `TranscriptImageAssets`, resolves it for the mounted block, and appends Pi TUI's public `Image` component below the submitted prompt. The attachment/model path is therefore intact; the failure is presentation.

Pi TUI 0.87.1 detects WezTerm as Kitty-capable and Windows Terminal as having no image protocol. Its fullscreen renderer includes an initial WezTerm clear-before-placement repair, but a later write to any row covered by an unchanged Kitty placement can still erase those image cells. This matches the reported blank reserved region and the remaining reproduction documented in upstream issue `earendil-works/pi#9169`. Windows Terminal intentionally receives Pi's textual `[Image: …]` fallback.

The user-provided `pi-imgcat` package is useful evidence but is not a drop-in solution. Its command/tool emit ordinary Pi image content on native paths; on every Windows path it instead attempts Sixel through an optional external PowerShell module and then falls back to ANSI half-block art. Installing that package would not replace bare A1's submitted-user-image presenter, and requiring its machine-level module would make core behavior depend on unowned software. The reusable idea is the bounded text-cell fallback, not the extension itself.

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

Introduce an A1-owned presentation policy for retained user transcript attachments. Reliable non-Windows image-capable environments continue to use Pi TUI's public `Image` component. Bare A1 on Windows uses the bounded text-cell preview whether Pi reports `kitty`, `iterm2`, or no image protocol, so Windows WezTerm cannot reserve rows for an APC placement that later disappears and Windows Terminal no longer stops at metadata-only text.

The policy is explicit and independently testable from platform, shell route, visibility setting, and terminal capabilities. It applies only to the bare-A1 submitted-user-image surface. `a1 pi` and installed Pi retain their detected protocol and renderer unchanged.

Switching only Windows WezTerm from Kitty to iTerm2 was rejected because `pi-imgcat` records that native ConPTY can filter both transports, and it would not improve Windows Terminal. Depending on a terminal-version allowlist was rejected because capability environment variables do not prove the complete Windows transport path.

### 2. Generate a bounded ANSI half-block preview off-thread

Extend the owned image worker boundary with a preview operation that decodes the retained prepared attachment, scales it to a finite cell budget while preserving aspect ratio, and returns presentation rows rather than image bytes. Each cell represents two vertically sampled pixels using a Unicode upper-half block with bounded truecolor foreground/background sequences. Transparent samples use a defined theme-safe treatment rather than leaking uninitialized pixel values.

The requested width is clamped by the current transcript image-width setting, available component width, and a fixed maximum. Height, decoded pixels, output rows, and encoded terminal bytes also receive fixed limits. The worker returns only bounded rows or a classified unavailable result; raw codec diagnostics and image bytes never enter notices, logs, or tests.

Main-thread decoding was rejected because screenshot conversion can suspend input and streaming. Sixel was rejected for this change because A1 has no owned encoder and the reference package delegates encoding to an optional machine-installed module. A metadata-only fallback was rejected because that is the reported Windows Terminal deficiency.

### 3. Tie preview work to mounted attachment identity and lifecycle

A mounted submitted-image presenter starts at most one conversion at a time, queues only its current unresolved attachments, and caches completed rows by stable retained asset identity plus effective width/theme inputs. A width or relevant presentation change invalidates the derived rows without duplicating the original base64 payload. Removal, block replacement, session replacement, or disposal prevents late completion from repainting a newer surface.

While conversion is pending, the transcript shows a bounded preparing marker instead of silent blank rows. A decode failure, unsupported image, deadline, cancellation, or output-bound violation produces the existing safe unavailable/metadata-style fallback and leaves surrounding prompt content visible. Hidden images start no preview work and retain `[Image hidden: …]` behavior.

Reusing prompt-paste preparation state was rejected because persisted/restored transcript assets and current-session clipboard jobs have different ownership and lifetimes.

### 4. Keep attachment semantics and comparison behavior unchanged

Preview generation reads the retained prepared attachment but never replaces it. Original MIME type and base64 continue to drive stored session content and model delivery. Screenshot chip labels, submitted prompt text, resize guidance filtering, history sidecars, image count/size limits, and coordinate mapping remain unchanged.

The fallback is presentation-only. It does not claim a new attachment was created, does not send ANSI rows to the model, and does not alter image visibility settings. The explicit `a1 pi` route remains the independent pinned comparison and receives no A1 fallback.

### 5. Prove both semantic output and terminal behavior

Focused worker tests will cover aspect preservation, color pairing, transparency, malformed input, width/height/output limits, cancellation, and payload-free failures. Presenter tests will cover policy selection, pending/ready/unavailable/hidden states, width changes, stale completion, disposal, and original-attachment identity. Terminal evidence will assert Windows fallback frames contain bounded ordinary cell rows and no Kitty APC, iTerm OSC 1337, Sixel DCS, or base64 payload, while reliable native and `a1 pi` fixtures remain unchanged.

Automated evidence cannot establish actual host colors or readability. Acceptance therefore includes the exact built candidate in current Windows WezTerm and Windows Terminal, checking initial paint, later status/assistant updates, scrolling away/back, resize, hidden-image mode, and continued input responsiveness.

## Risks / Trade-offs

- **[ANSI previews have lower fidelity than native pixels]** → Preserve aspect ratio, use truecolor paired samples, honor the configured image width, and limit the fallback to Windows bare A1 where the current result is blank or metadata-only.
- **[Large screenshots can consume CPU or terminal bytes]** → Decode in the existing bounded worker infrastructure and cap input, decoded pixels, cells, rows, output bytes, concurrency, and deadline.
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
