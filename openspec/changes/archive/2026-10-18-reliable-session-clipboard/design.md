# Design

## Context

The current response-copy helper attempts one destination selected from process environment and available terminal plumbing. A local copy normally imports `@mariozechner/clipboard` and calls its native writer; terminal fallback is attached only when the shell believes asynchronous terminal output is available. Import failure, native write denial, helper transport failure, an unsafe route, and several other outcomes are then collapsed by the shell into `Could not copy the selection; the clipboard is unavailable.` The message therefore does not establish that the Windows or host clipboard is unavailable; it hides which internal route failed. The screenshot alone cannot identify that hidden outcome because content-free diagnostics were not enabled.

Bare A1 also renders workflow status, warning, error, command-result, and new-session notices as selectable dock text. Dock copy metadata currently declares only ordinary prompt-body and footer rows, so those selected messages are visual-only even though their text is meaningful to the user.

## Goals / Non-Goals

**Goals:**

- Make every admitted copy in a supported local desktop session commit to the standard operating-system clipboard.
- Preserve local, resident, WSL, SSH, terminal-multiplexer, and terminal-host destination semantics while ensuring each has a certified writable route.
- Recover silently from transient writer contention or one unavailable implementation by retrying or using another supported implementation.
- Remove copy-failure workflow messages; successful copies retain the existing acknowledgement.
- Admit visible user-facing session messages through copy-on-select and `Ctrl+C` without admitting structural decoration.

**Non-Goals:**

- Claiming that an unsupported or externally prohibited environment can override operating-system or terminal security policy.
- Removing finite payload, deadline, cancellation, session-lifetime, or stale-intent safeguards.
- Making borders, padding, scrollbars, cursor markers, autocomplete controls, alignment-only rows, or modal-covered cells clipboard content.
- Changing regular terminal-owned selection in `a1 pi`, `/copy` semantics, or keyboard prompt copy/cut behavior.

## Decisions

### 1. Use a resilient standard-clipboard writer for local sessions

Local copy will prepare immutable plain text in the existing isolated helper and submit it through one standard-clipboard writer that owns platform behavior. The writer will prefer the native clipboard binding, retry transient contention within the existing deadline, and then use the supported platform command route when native loading or writing cannot complete. Windows will retain a noninteractive hidden PowerShell fallback, macOS will use `pbcopy`, and Linux desktop sessions will use the available Wayland or X11 writer. A reported success must mean that one route accepted the complete payload; a missing optional native binding alone is not a failed copy.

Reusing the current single native attempt was rejected because Windows clipboard contention and optional native-package availability can turn a recoverable route issue into a user-visible failure. Writing directly inside input handling was rejected because clipboard access must remain asynchronous and cancelable.

### 2. Keep terminal delivery for remote boundaries and certify resident forwarding

SSH, WSL, and terminal-multiplexer destinations will retain bounded OSC 52 delivery to the user's terminal rather than writing a remote host's clipboard. The terminal submission seam will be available from the owned terminal host instead of inferred only from `stdout` shape. Resident A1 will forward the viewed child's accepted clipboard effect exactly once to the outer terminal; hidden or stale tabs will remain unable to alter the clipboard.

Treating every process as local was rejected because a native write on an SSH server targets the wrong machine. Depending on `isTTY` or pipe classification alone was rejected because resident and pseudoterminal topology can hide a valid outer clipboard route.

### 3. Do not render clipboard implementation failures as session content

Copy coordination will keep bounded retries, cancellation, diagnostics, and stale-intent fencing, but unsuccessful internal attempts will not append status, warning, or error rows. The user-facing contract is ordinary clipboard behavior plus success acknowledgement, not speculative explanations about an unavailable clipboard. Metadata-only diagnostics may continue to distinguish native import, contention, platform-command, terminal submission, timeout, size, and cancellation outcomes without recording copied text.

Replacing the existing sentence with a more detailed error was rejected by the maintainer. Retaining a final failure notice after fallback was rejected for the same reason.

### 4. Declare message copy ranges from dock composition

Dock composition will identify the exact rows occupied by visible status, warning, error, command-result, and notice messages and add them to the same structural copy metadata used for prompt and footer rows. Extraction will preserve selected visible columns and wrapping, strip ANSI/OSC controls, omit presentation padding, and retain message order in mixed transcript/message/prompt/footer ranges. Both automatic release and `Ctrl+C` will use this one eligibility policy.

Classifying messages by color, prefixes, or rendered wording was rejected because themes, wrapping, localization, and user-controlled text make presentation parsing unsafe. Making the entire dock copyable was rejected because it would include editor borders, autocomplete controls, widgets, and alignment-only rows.

### 5. Cover route availability and exact payloads at focused boundaries

Transport tests will exercise native success, transient native contention followed by retry, missing native binding followed by platform fallback, platform failure followed by terminal fallback where applicable, cancellation, stale tabs, and exactly-once resident forwarding. Shell and viewport tests will exercise each message kind alone and in mixed selections under both copy-on-select settings, and assert that no copy-failure text is rendered. Package tests will ensure supported installations contain or can reach their declared platform writer rather than silently depending on a development checkout.

## Risks / Trade-offs

- **[Platform fallback command is absent]** → Keep the native binding as the primary local route, certify package installation per supported OS, and require at least one successful writer in packaged smoke coverage.
- **[Windows clipboard is temporarily locked]** → Retry only recognized transient contention with bounded backoff inside the existing copy deadline, then use the platform fallback.
- **[Two routes write the same intent]** → Run attempts sequentially and begin fallback only after the prior route has definitively stopped.
- **[Resident forwarding targets the wrong tab]** → Preserve active-view revision fencing and existing hidden/stale clipboard-effect rejection.
- **[Message metadata drifts from rendered rows]** → Derive ranges from the same dock segments that compose the message and cover wrapping, replacement, resize, and dock-only recomposition.
- **[Silent terminal or policy refusal remains externally possible]** → Do not fabricate an in-app diagnosis; retain metadata diagnostics while supported local and resident packages are required to pass real clipboard smoke coverage.

## Migration Plan

No persisted-data migration is required. Implementation will first add failing transport and message-selection regressions, then introduce the resilient local writer and explicit terminal-host route, remove copy-failure presentation, and add structural message copy ranges. Rollback restores the previous single-route writer and message exclusions without changing settings or stored sessions.
