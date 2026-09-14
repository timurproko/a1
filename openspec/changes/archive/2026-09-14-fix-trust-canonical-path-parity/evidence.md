# Implementation evidence

## Authorization and source

The maintainer explicitly approved the plan and requested implementation: “approved, implement it”. Work continues in the same clean detached worktree `D:/Git/a1/.worktrees/fix-trust-canonical-path-parity`, branch `fix/trust-canonical-path-parity`, draft PR [#390](https://github.com/timurproko/a1/pull/390), planning head `7fb4b68a553a8cbb2462a2d2e5fd48b26c28d60d`, base `5a416891`. Version-2 linkage and mechanical archive task mapping 5.1/5.2 were verified. This authorization is not final acceptance or merge permission.

Planning-head CI: merge-policy enforcement passed; development validation was skipped for the draft. No implementation CI success is inferred from those skips.

## Original regression

[Full regression 34854247359](https://github.com/timurproko/a1/actions/runs/34854247359), head `f3cbdc64f9316089c6b764e54c4cfa023c9ee876`, failed in [macOS Node 24 job 104009697994](https://github.com/timurproko/a1/actions/runs/34854247359/job/104009697994). Both truecolor and 256-color command-outcome cases failed at `dark/0/trust/open/80 selector messages`. Pinned `/private/var/.../T` wraps onto a second parent-option row; owned `/var/.../T` fits on one row. Linux Node 24 and Windows Node 22/24 passed. This failure followed the scoped-model correction, not a recurrence of raw Alt hints.

Pinned Pi 0.84.2's trust manager resolves then canonicalizes the project before deriving its parent; its store already canonicalizes lookup/write paths. The owned adapter instead derives options from lexical `resolve(cwd)`. The supplied cwd heading is intentionally separate from canonical trust-option identity. See design.md for the source trace and rejected normalization workarounds.

## Local implementation validation

- Before correction, the real alias/junction context suite produced **5 failures / 7 passes** on Windows Node 24: option identity, saved trusted/denied/parent presentation, and parent persistence detected the defect. Fixture-setup errors were corrected before recording this red result.
- The adapter now canonicalizes only the trust identity, derives its parent afterward, and retains the resolved cwd heading and pinned lookup-failure fallback. No production helper or private dependency import was necessary.
- Windows Node **24.16.0** and **22.23.2**: **16 tests passed each** across `project-trust-context.test.ts` (12) and `command-outcome-parity.test.ts` (4).
- Added 18 independent command cases cover real aliases and canonical paths, direct trusted/denied and inherited parent/ancestor state, project/parent/deny persistence, and cancellation across the existing full geometry/theme/padding/color matrix. The shared fixture supplies filesystem/seed inputs and observes the actual store; it does not produce expected labels or normalize paths.
- Captures compare raw trust writes, before/after stores, current session trust, lifecycle calls, and exact styled rows. Negative checks reject a lexical-parent label insertion, a wrong parent write, semantic ANSI changes, and collapsed wrapping.
- Typecheck, build, architecture/provenance checks, and full code-documentation governance passed locally. No local full suite, publication, or interactive UI automation was run. Pinned dependencies, source ledger, source-synchronized selector, rendered baselines, and existing exceptions remain unchanged.

## Manual review handoff

Worktree: `D:/Git/a1/.worktrees/fix-trust-canonical-path-parity`; branch: `fix/trust-canonical-path-parity`. Use the implementation head reported in PR #390, not the original planning head. A disposable review session is prepared under `.artifacts/trust-parity/review-h3AoFD`: its stored cwd is `alias-parent/project`, pointing to `canonical-parent/project`. Session opening was verified to preserve that alias. Its isolated profile defaults to untrusted and an empty project settings file makes trust preflight applicable; preflight was verified to return untrusted without a prompt. Environment inspection verified profile and control-state isolation. No terminal review has been performed.

Build and launch the prepared session in Windows Git Bash:

```sh
cd D:/Git/a1/.worktrees/fix-trust-canonical-path-parity && npm run build && r="$PWD/.artifacts/trust-parity/review-h3AoFD" && A1_PROFILE_HOME="$r/home" A1_CONFIG_DIR="$r/config" A1_DATA_DIR="$r/data" A1_RUNTIME_DIR="$r/runtime" ./scripts/dev --session "$r/session.jsonl"
```

Use bare A1's supported explicit session-file launch: `pi --session` is not supported. Open `/trust`; the cwd heading should show `alias-parent/project`, while the parent choice names `canonical-parent`. Compare at 80 columns and narrow widths. Save parent trust and reopen to inspect its inherited decision/checkmark; save a direct denial or trust and reopen to inspect the direct choice. Confirm each save reports restart required and leaves current-session trust unchanged. Cancel after navigating and confirm no saved decision changes. Relaunch this same command to inspect the persisted choice. All writes stay in the disposable profile; no existing user trust decisions need changing. An empty profile need not have provider credentials to inspect `/trust`.

The prepared paths are local ignored artifacts, not portable fixture evidence; native CI creates its own symlink/junction cases. Actual manual acceptance and reviewed canonical-spec baseline must still be reported for the exact final head, with separate manual merge authorization.

## Post-merge ownership

After accepted integration, resume the outstanding merged-package validation tasks of `fix-nightly-platform-validation` and `fix-scoped-model-platform-hints`: validate a **newly numbered merged implementation package** with full nightly-equivalent scope and record source commit, package version, digest, run URLs, and all four lane outcomes. Do not modify published bytes or substitute this branch's regression tarballs for that evidence. No tasks or acceptance in those separate changes are completed by this PR.

## Pending

Current-head required CI, all four native Full regression lanes, actual final-head manual acceptance, and explicit manual merge authorization remain pending. No acceptance is inferred from approval to implement. PR #390 remains draft with auto-merge disabled until applicable validation permits final review.
