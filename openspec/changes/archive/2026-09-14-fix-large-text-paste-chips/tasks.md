## Implementation evidence

- Implements the specification accepted in PR #327 (`e656d405`).
- Local debugging validation: 263 focused tests passed across text-paste policy, semantic chips, editor interactions/parity, session-shell dispatch/lifecycle, and durable history. Typechecking, build, strict change validation, and whitespace checks passed.
- Runnable handoff: `D:/Git/a1/.worktrees/implement-large-text-paste-chips`, branch `fix/large-text-paste-chips`; build with `npm run build` and launch with `./scripts/dev` (comparison: `./scripts/dev pi`). The implementation PR carries the commit and manual checklist.
- CI correction: PR #330's first run failed `DOC005` for two unprefixed test comments. Both comments now use the required categories; the exact changed-file documentation check using that CI run's impact artifact and all 20 editor text-paste tests pass locally. Runtime behavior is unchanged by this correction.
- Required CI and physical acceptance remain pending; this change is not accepted or archived.

## 1. Add one owned text-paste representation

- [x] 1.1 Add pinned-compatible ordinary-text normalization and threshold classification; verify oracle comparisons for 10/11 lines, 1,000/1,001 UTF-16 code units, the 136-line example, CRLF/CR, trailing newlines, tabs, CSI-u controls, and Unicode.
- [x] 1.2 Add immutable text-paste records and Pi-style labels to the semantic chip store; verify distinct recoverable identities, repeated identical payloads, short inline text, and unchanged URL/file/folder/image classification.
- [x] 1.3 Resolve draft spans and pending records without rescanning emitted payloads; verify copy, submission, and history preserve literal marker-like strings, registered-looking labels inside pasted text, surrounding text, and every repeated occurrence without spurious image attachments.

## 2. Unify default-editor paste routes

- [x] 2.1 Wire asynchronous clipboard reservations, the fallback clipboard path, and right-click paste through text-chip transformation; verify captured selection replacement, invisible unresolved text reads, later typing, and out-of-order acquisition in both history-enabled and history-disabled editors.
- [x] 2.2 Route complete and fragmented bracketed pastes through the same owner before native paste allocation; verify split framing/payloads, mixed clipboard/terminal actions, no duplicate registry identities, no newline-triggered submission, and ordered handling of input following the closing delimiter.
- [x] 2.3 Add live text chips to atomic editing and presentation ranges; verify Left/Right, Backspace/Delete, keyboard/pointer selection, copy/cut, and width-safe rendering with Unicode and widths shorter than a label, while unregistered markers remain ordinary text.
- [x] 2.4 Preserve payload backing through undo/redo, selection replacement, and draft history navigation; verify deletion and subsequent pastes cannot overwrite a recoverable chip, and undo/restored drafts still expand exactly.

## 3. Verify shell lifecycle and submission integration

- [x] 3.1 Exercise ordinary, steering, follow-up, and compaction-queued submissions and queue recovery; verify captured text contains complete ordered payloads exactly once and remains independent of newer drafts.
- [x] 3.2 Verify Enter-before-readiness, cancellation, deletion-before-completion, session replacement, and disposal; assert no partial dispatch, late reinsertion, or cross-session payload reuse.
- [x] 3.3 Verify durable history receives expanded authored text and can recall it in a fresh process; cover preserved internal Unicode/line breaks, literal image-looking payload text, and unchanged history size/eligibility rules without a new paste archive.
- [x] 3.4 Verify unchanged native-Pi behavior and existing specialized chip behavior with focused parity and regression tests; ensure no installed dependency mutation or new configuration/dependency is introduced.

## 4. Validate and hand off the implementation

- [ ] 4.1 Push the separately authorized implementation PR citing this accepted change and report required CI results; leave implementation acceptance pending rather than auto-merging code.
- [x] 4.2 Deliver the exact implementation worktree/commit and build-first `./scripts/dev` manual command; verify the checklist covers Windows Terminal/Git Bash clipboard shortcuts, right-click, terminal paste, 136 lines, a long single line, short inline text, deletion/undo, and exact submitted content against `./scripts/dev pi`.
- [ ] 4.3 Record explicit user acceptance after physical review and obtain authorized code integration; then synchronize and archive this completed change in a specification-only follow-up, with evidence links for CI and acceptance.
