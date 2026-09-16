## Context

See `proposal.md` for the report and scope. Bare A1 currently recognizes `Ctrl+V` in the custom viewport pre-input boundary, then calls the same owned-editor paste admission used by editor right-click. Admission creates a provisional reservation immediately and starts an isolated helper with a 5-second acquisition budget inside a 15-second total lifetime. A terminal may instead consume `Ctrl+V` and send bracketed paste bytes.

The reported sequence—first keyboard paste is a no-op, right-click succeeds, later keyboard paste succeeds—can arise before admission, during cold helper startup, or during clipboard acquisition. Current source also treats an empty native text result in strict isolated acquisition as final instead of trying the existing platform command fallback, while the declared clipboard preload is not used and would not warm the per-request helper process. This is a concrete candidate for the observed first-use no-op, not yet a proven root cause.

The existing `fix-response-copy-freeze` delivery introduced bounded paste isolation and already owns broad copy/paste responsiveness, limits, chip semantics, and cleanup. This corrective change must preserve those controls and must not rewrite the paste architecture merely to warm a process.

## Goals / Non-Goals

**Goals:**
- Establish whether the first shortcut reached A1, was admitted, and failed in acquisition or insertion without recording clipboard payloads.
- Make cold first-use keyboard paste and right-click paste converge on one exactly-once bounded transaction after gesture routing.
- Treat a safe fallback that succeeds within the existing acquisition budget as part of the original paste rather than requiring user repetition.
- Keep a later paste independent after a genuine first-paste failure.

**Non-Goals:**
- Guarantee clipboard access when the OS, terminal, remote topology, or another process denies it for the full deadline.
- Change paste limits, path/URL/image classification, chip presentation, undo/redo, or response-copy behavior.
- Make the ordinary prompt intercept modal input or alter `a1 pi`.
- Keep an idle clipboard helper alive, patch the native clipboard package, or read clipboard contents for diagnostics.

## Decisions

### 1. Prove the failing phase at the existing boundaries

Extend the payload-free diagnostic sequence so a cold fixture and physical run can distinguish raw shortcut receipt, key match, synchronous reservation admission, helper start/read/fallback, insertion, and settlement. Tests will exercise the real standard control byte and terminal bracketed framing, not only a test double whose input string is literally `ctrl+v`.

The admission contract will be asserted directly: when the default editor is active and its configured `Ctrl+V` matches, one reservation exists before the pre-input turn returns and the original key cannot fall through to a second handler. Right-click will assert the same admission result while retaining its mouse ownership rules.

Alternative rejected: assume the native reader is solely responsible and change it without proving that the first keyboard event reaches the admission boundary.

### 2. Treat an empty native text read as inconclusive until the supported fallback is checked

For an isolated native acquisition on Windows or macOS, nonempty native text remains authoritative. A thrown native read or an empty native text result proceeds to the existing platform command reader under the same abort signal and acquisition deadline. A nonempty fallback result is adopted by the same request. If all supported readers return empty, the operation remains an empty clipboard no-op; if readers fail, existing strict failure semantics apply.

On Linux, the existing ordered Wayland/X11 fallback remains bounded, but strict execution must not turn one empty or unavailable backend into a permanent warm-up dependency when the next supported backend is available. Format/image detection stays ahead of text fallback so this change does not duplicate a known image or file-drop payload.

Alternative rejected: retry the entire paste gesture or synthesize a second reservation. That can duplicate content, reset deadlines, and reorder later typing. Also rejected: call the UI-process preload function, because clipboard reads happen in a fresh isolated helper and preloading the UI process does not establish helper readiness.

### 3. Keep recovery finite and identity-safe

Fallback is a bounded continuation of one acquisition, not an open retry loop. It receives the original abort signal, shares the 5-second acquisition and 15-second total deadlines, and stops once one payload is known. Existing request generation, reservation identity, cancellation, helper stop grace, and late-result checks remain authoritative. A later gesture starts a fresh transaction after an empty or failed result.

Alternative rejected: cache the first successful right-click or retain a warmed helper as a prerequisite for future keyboard pastes. Correctness must hold after every cold process start and helper restart.

### 4. Validate real cold starts and route compatibility

Focused evidence will include repeated fresh helper processes, first-use native-empty/platform-success, native failure/platform-success, genuine empty/failure, clipboard contention, immediate following input, first terminal-owned bracketed paste, and keyboard/right-click ordering. Packaged emitted-JavaScript tests will verify helper and fallback resolution, while physical handoff will begin with externally copied text and `Ctrl+V` before any mouse paste.

No test may pass by issuing right-click first. Modal/replacement ownership and `a1 pi` remain explicit controls.

Alternative rejected: validate only a warm in-process clipboard mock, which reproduces neither helper startup nor the reported priming sequence.

## Risks / Trade-offs

- **[A platform fallback can add latency when the clipboard is genuinely empty]** → Keep it inside the existing acquisition deadline, run it only after an inconclusive native text result, and preserve immediate native success.
- **[Fallback could duplicate or supersede image/file content]** → Stop text fallback after authoritative image/file detection and adopt at most one payload per request.
- **[The report may originate in key routing rather than acquisition]** → Gate implementation conclusions on receipt/admission evidence and retain focused routing work if the real control byte is dropped.
- **[Physical terminal ownership varies]** → Record whether the run delivered a key or bracketed payload; require both deterministic routes without treating one as evidence for the other.
- **[The earlier active clipboard change may be synchronized while this work is open]** → Rebase before implementation finalization and reconcile this delta against the resulting canonical requirement without weakening either contract.

## Migration Plan

1. Add failing cold-route and acquisition fixtures before changing production behavior.
2. Repair only the phase demonstrated by those fixtures, preserving the current reservation and deadline model.
3. Run focused source and emitted-helper validation, then build and hand off the exact candidate for first-action physical testing.
4. Finalize through the single-PR OpenSpec workflow only after all evidence and gap dispositions are complete. Rollback removes the corrective routing/acquisition behavior without changing stored sessions or settings.

## Open Questions

- The exact terminal/version and whether the failed physical `Ctrl+V` reached A1 as a control byte or was consumed by the terminal are not yet recorded. This affects attribution and physical evidence labeling, but not the requirement that both supported routes work on first use.
