# Herdr clipboard routing

## Context and investigation

The user's screenshots show short-text transfer in both directions with Claude Code, and PC1-to-PC2 transfer with A1. Selecting `How` in A1 on PC2 produces `Copied 3 chars to clipboard`, but pasting back into A1 on PC1 leaves its prompt empty. This is a copy-destination defect, not evidence that all A1 terminal-paste insertion is broken.

Source inspection establishes the failure mechanism:

- `responseCopyDestination` checks SSH, WSL, tmux, and screen markers, but not Herdr identity.
- `createResponseCopyExecutor` stops after successful native delivery; OSC 52 is only a fallback when local writers fail, or the primary route when destination policy selects the terminal.
- `response-copy-helper.ts` treats a successful native `setText` as delivered, regardless of whether that host owns the user's desired clipboard.
- `session-shell.ts` acknowledges delivered or submitted-unverified copy. Thus the displayed acknowledgement does not establish that Herdr's desktop clipboard changed.
- Herdr's `src/hc.rs` supplies `TERM_PROGRAM=herdr` when creating local or remote terminals. A1 already consumes `HC_TERMINAL_ID` for Herdr identity. This investigation's runtime has a terminal ID while `TERM_PROGRAM=ghostty`, so emulator-name detection alone is insufficient.
- The user's local Ctrl+V binding and custom right-click handler both invoke Herdr's `terminal.paste`. Herdr reads its own desktop clipboard and sends the text, bracketed when requested by the application.

The installed A1 `0.2.7-dev.1292` destination function was executed read-only: both `{ HC_TERMINAL_ID, TERM_PROGRAM: 'herdr' }` and `{ HC_TERMINAL_ID, TERM_PROGRAM: 'ghostty' }` select `native`; an SSH control selects `terminal`. No clipboard reads or writes were performed. Earlier synthetic framing checks passed, but they did not exercise copy destination. The inspected Herdr checkout declares 0.1.14 while the installed app reports 0.1.15; source analysis is not an exact-binary desktop trace. No live remote-process clipboard capture was performed.

## Goals

- Deliver Herdr-hosted owned text copies to the desktop attached through Herdr, independent of which machine runs A1.
- Prevent successful host-local copy from suppressing the required terminal clipboard delivery.
- Preserve terminal-provided paste and avoid a wrong-host native paste read.
- Keep existing non-Herdr destination behavior and bounded transport guarantees.

## Non-goals

- Changing Herdr binaries, mods, clipboard permissions, or user keybindings.
- Implementing OS clipboard synchronization between machines or OSC 52 clipboard queries.
- Changing copy acknowledgement wording, clipboard size/deadline policy, image conversion, or the pinned `a1 pi` comparison profile.
- Adding physical desktop automation or claiming screenshots certify the eventual fix.

## Decisions

### 1. Treat Herdr identity as a terminal-owned clipboard boundary

Extend the existing destination policy, rather than adding per-call-site Herdr checks. A nonempty `HC_TERMINAL_ID` selects `terminal` even when the emulator name is absent or different. `TERM_PROGRAM=herdr` also selects `terminal` when no terminal ID is available. Empty identity values and unrelated emulator names alone do not change the ordinary local route. Preserve all existing SSH, WSL, and multiplexer decisions.

Herdr can attach a desktop to an agent on another machine without conventional SSH markers. The agent cannot reliably infer that its desktop clipboard is the viewer's clipboard, so both local and remote Herdr-hosted sessions use the same terminal-owned route. A successful host-native writer is not an acceptable substitute.

### 2. Reuse the bounded OSC 52 transport

Use the existing terminal submission path for selection autocopy, explicit selection copy, and other owned text-copy consumers. Preserve exact payload encoding, limits, cancellation, isolation, and ordering. Submit once, do not additionally write the native clipboard, and do not fall back to the host clipboard when the terminal route is unavailable. Keep `submitted-unverified` distinct from acknowledged native delivery internally; this proposal does not change existing UI feedback semantics.

### 3. Preserve the shared paste boundary

`ShellClipboard.capturePaste` also consumes the destination policy. Herdr-hosted native paste must therefore remain unavailable rather than reading the wrong host. Nonempty text supplied by Herdr through bracketed paste must still insert exactly once without a redundant native read. Explicit injected clipboard ports retain their existing behavior. Raw Ctrl+V or a forwarded mouse report without clipboard text does not acquire a new remote-clipboard capability.

### 4. Keep the change localized

Prefer a small policy change and focused tests in the session-shell owner. Do not add a new Herdr service or change the existing feature-owner identity/reporting contract merely to classify clipboard transport. Update the clipboard architecture document to describe the new destination and paste behavior.

## Alternatives rejected

- Depend only on SSH variables: Herdr's remote terminals do not require them.
- Depend only on `TERM_PROGRAM`: the observed runtime reports `ghostty` despite having Herdr terminal identity.
- Emit both native and terminal writes: touches an unrelated host clipboard and weakens one-intent/one-effect semantics.
- Repair Herdr keybindings or paste framing: the inspected configuration already sends text; this does not repair A1's remote copy destination.

## Planned validation

- Destination matrix: terminal ID only; terminal ID with `herdr`, `ghostty`, or missing emulator; `TERM_PROGRAM=herdr` alone; empty values; unrelated local emulator; existing SSH/WSL/multiplexer controls.
- Isolated copy fixture: a Herdr environment chooses terminal delivery even if a fake native writer would succeed; capture one complete OSC 52 payload and assert no native/platform write. Exercise exact short text, Unicode, and existing unavailable-route/limit safeguards without touching the real clipboard.
- Shell fixtures: autocopy and explicit copy use the shared route; nonempty Herdr-style terminal paste inserts once without native acquisition; native clipboard acquisition is refused for Herdr identity unless an explicit clipboard port supplies it.
- Focused owner tests, typecheck, strict OpenSpec validation, and the small documentation checks relevant to changed files; no broad local suite is needed for this draft.
- Optional physical acceptance after implementation: repeat the supplied short-word round trip in both directions through Herdr. Mocked transport checks do not certify the live desktop result.

## Risks and known gaps

An inherited Herdr terminal ID can persist in descendants; intentionally retaining terminal ownership is safer than silently targeting the agent host's clipboard. Herdr may deny OSC 52 writes through its own settings, and terminal submission provides no clipboard acknowledgement. Those existing limitations remain explicit. The destination policy, isolated transport regressions, shell regressions, and architecture documentation are implemented. Focused automated checks are recorded in `implementation-evidence.md`. Physical cross-machine Herdr clipboard behavior remains unverified; this is an optional maintainer acceptance check, not a claim made by the hermetic fixtures. No substantive implementation gap is deferred.
