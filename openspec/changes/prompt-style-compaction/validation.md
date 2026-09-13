# Implementation validation

Accepted specification: PR #356. Implementation base: `bd390775` (`origin/develop` when the implementation worktree was created).

## Automated checks

- `env -u PI_OFFLINE npx vitest run test/integrations/pi/components/compaction-prompt.test.ts test/integrations/pi/components/shell-components.test.ts test/integrations/pi/session-ui/session-shell.test.ts test/ui/components/submitted-prompt.test.ts test/ui/components/transcript-viewport.test.ts`: **288 passed, 0 failed** across five focused files.
- `npm run typecheck`: passed.
- `openspec validate prompt-style-compaction --strict`: passed.
- `git diff --check`: passed.
- `npm run build`: passed.
- No local `test:fast`, `test:full`, or `test:release` tier was run.

### First CI and manual-launch follow-up

CI run `34752831521` passed rendering, both Windows startup budgets, naming, and process-containment checks. Documentation validation identified four missing reason prefixes on implementation comments; those comments are corrected, and `node scripts/governance/check-code-documentation.mjs --mode full --root .` passes with no violations.

Fast CI reported 2508 passing tests, 1 failure, and 8 skipped. Its only failure was the unchanged dependency-certification cleanup test exceeding 5000 ms. The exact test passes in isolation without a timeout change. Investigation is tracked separately in [issue #361](https://github.com/timurproko/a1/issues/361); no release-cleanup code or assertions are modified here. Required CI remains blocking until the new candidate succeeds.

The first manual command failed before launching the UI: Git Bash's installed `etc/profile.d/aliases.sh` aliases `node` to `winpty node.exe`, which rejects command-substitution stdout as non-TTY. The corrected command below uses `command node` to bypass interactive aliases/functions and checks generation success before invoking A1. A local shell regression reproducing a failing `node` wrapper confirms that the corrected path creates a nonempty, existing session file. This is launch-path evidence, not physical visual acceptance.

Coverage includes actual terminal bold attributes with Pi's own Chalk instance explicitly enabled, summary-internal emphasis, grouped token count, original timestamp, narrow widths, no compaction expansion, ordinary tool expansion, real engine/shell initial and new summary delivery, settlement, prompt-history exclusion, multiple anchors, all scrollbar appearances, sticky activation, prominent/quiet states, Shift+Up/Down and Alt+Home, selector ownership, streaming cache reuse, selection/copy across resize, native web/file targets and colors, and branch/status/comparison exclusions.

The new review-session script is also tested through the real public Pi session manager and engine/shell. It creates a fresh disposable JSONL session using synthetic content, a real compaction entry, and two retained ordinary prompts. It neither calls a model nor reads a private conversation. The same-timestamp navigation fixture covers distinct loaded anchors; it is not evidence that this change repairs unrelated engine live-event timestamp collisions.

### Prompt-style review clarification

Required CI run `34753384301` passed for `1d9ea849`, including the previously timed-out fast check. The PR remains open without auto-merge; physical acceptance is still outstanding.

The user clarified that compactions must have no special purple fill: full and pinned states must follow normal prompt styles, including dimming the entire pinned row once its full source block is above the viewport. A new real-shell/headless-cell comparison verifies identical backgrounds and visible-glyph foreground, bold, and dim attributes for normal prompts and compactions in source, prominent-pinned, and quiet-pinned states. It explicitly checks that both label and timestamp become dim only in the final state. Existing shared prompt rendering already satisfies this comparison; no special compaction palette or ordinary-prompt behavior change was introduced. All 22 compaction-focused tests pass after this review-fixture refinement, along with typechecking, full documentation governance, strict OpenSpec validation, and diff checks.

Removed the synthetic end-marker sentence from the review-session generator. The fixture regression now verifies the last actual summary section remains present and the unwanted marker is absent; actual session summaries are not filtered. The synthetic retained tail now includes answer rows before the next prompt, providing a visible interval where the compaction header becomes quiet instead of being immediately replaced by the next prompt. A fresh marker-free local review session is available at `.artifacts/compaction-v3.jsonl`, without modifying the user's already-open review file.

## Candidate review

Worktree: `D:/Git/a1/.worktrees/prompt-style-compaction-impl`

Branch: `feature/prompt-style-compaction`

Build and launch the synthetic compaction session from that worktree:

```sh
npm run build && session_file="$(command node scripts/pi/create-compaction-review-session.mjs)" && test -n "$session_file" && ./scripts/dev --session "$session_file"
```

Starting at the bottom, use Shift+Up repeatedly to reach the earlier ordinary prompt and the compaction. The first compaction has the ordinary opening breathing row. Scroll within its long summary to pin the normal prompt-style header and timestamp; click that pinned row to return to its source. Scroll past the entire summary to see quiet pinned context. Use Shift+Down to move through the same anchors and return to following the live bottom. Ctrl+O must not hide the compaction; its full source header must not be bold, while deliberate emphasis inside the summary remains intact. Resize and select/copy summary text. The example file link is deliberately illustrative and does not require a real target file.

The script creates a new review session under `.artifacts/compaction-review/` on each invocation; the user does not need to submit a prompt or invoke compaction against a model. Physical visual acceptance remains pending. Headless checks do not establish native terminal hover acceptance or repair the unrelated ghost-link/flicker issues. The implementation PR must remain open until the user validates the exact candidate and explicitly authorizes its merge.
