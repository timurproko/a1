# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the sync report comment, and the pull request's generated implementation outcomes are checked as the reviewer completes them.

## Proposed implementation decisions

This section is a plan awaiting maintainer approval; the generated sync report below remains historical proposal evidence, not a report of completed repairs.

### Missing-folder recovery

Adopt Pi 1.5.2's Continue, Fork, and Cancel behavior rather than retire the new feature as unsupported. Continue uses the current directory for that invocation without rewriting the original session. Fork creates a distinct session ID in the current directory so later resumes do not need the same recovery prompt. Cancel leaves the active session unchanged. Match the pinned selector's labels, instructions, focus restoration, and cancellation/status behavior through the owned UI.

Trace startup session selection, resume, import, and extension-triggered session switching independently. Reuse public pinned SDK operations for copying and switching; keep Pi-specific details in the engine adapter and expose a vendor-neutral recovery choice to the shell. Preserve existing cross-project resume decisions and A1's single-writer protections; never modify a session owned by another process. Import recovery must not leave a failed intermediate copy or duplicate files sharing an ID.

Repair the two orphaned modal inventory anchors against the new upstream controller and describe the three choices and their transitions. Mark the feature adoption row implemented only after its owned behavior and tests exist. The changed InteractiveMode export is not consumed by A1; review its delta without introducing a new dependency on that controller. Review all 33 unchanged vendored copies and retain existing A1 deviations unless an actual upstream delta requires adoption.

### Generated evidence and upgrade compatibility

Generate source-side Pi settings metadata before the standalone component/event-frame parity scripts load source modules; the ordinary build only generates the dist-side resource. Keep generated metadata ignored rather than committing it. Add a focused regression at the generation boundary so a clean checkout can refresh parity without relying on a preceding Vitest run.

Re-evaluate the exact node-domexception transitive dependency path for Pi 1.5.2 before updating its documented exception. Do not broaden the accepted package, version, reason, or dependency scope. Classify any remaining parity-suite failures individually; the sync report's truncated output is not proof that all ten failures share that cause.

Refresh current-pin provenance and derived parity records through their owning generators. Update live documentation and release notes, while preserving historical archives, old-version changelog entries, and unrelated asset content. The report's broad count of old-pin mentions is a review list, not a bulk-replacement instruction.

### Delivery and bounded validation

Continue branch chore/pi-1.5.2 and PR 906 in this worktree. Reconcile current origin/develop, including the already integrated session-continuity repair, before final evidence generation. Preserve the four generated Implementation outcomes; add detailed bookkeeping beneath them rather than rewriting them. No product implementation edits precede approval of this plan.

After approval, use typecheck, strict validation of this OpenSpec change, and explicit test files covering session selection/recovery, workflow requests, shell dialogs, modal inventory, feature adoption, deprecated dependencies, and parity generation. Do not rerun directory-wide suites locally. Regenerate the affected component/event-frame fixtures and inspect every changed baseline. Leave unresolved failures and substantive gaps visible; final readiness and exact-head validation remain owned by trusted automation.

## Sync report at proposal

- Vendored copies: 0 merged cleanly; 0 with conflict markers to resolve; 33 unchanged upstream; 0 kept as A1's version.
- Inventories: 0 anchors rewritten, 12 behavior ranges moved, 2 entries orphaned (session.missing-cwd, resume.missing-cwd.close), 0 components unmapped.
- Public API: 0 exports added, 0 removed (0 consumed by A1), 1 changed (0 consumed by A1).
  - not consumed by A1: InteractiveMode
- New upstream features awaiting an A1 disposition: 1; rows retired upstream: 0; rows still pending: 1.
  - changelog:1.5.2:fork-sessions-whose-folder-is-gone: Fork sessions whose folder is gone — when a session's original folder was moved or deleted, you can now fork it into the current folder instead of only continuing, so later resumes no longer ask.
- Automated gates:
  - pass bump: pinned @earendil-works/pi-coding-agent and @earendil-works/pi-tui at 1.5.2
  - pass evaluator: install, compile, runtime
  - pass install: installed the candidate dependency set
  - pass build: failed against the previous startup baseline; passed after the startup-graph re-pin
  - pass merge: 0 clean, 0 conflicted, 33 unchanged, 0 kept
  - pass ledger: source ledger and provenance headers regenerated
  - pass inventories: 0 re-anchored, 12 moved, 2 orphaned, 0 unmapped
  - pass public-api: 0 added, 0 removed, 1 changed
  - pass matrix: 1 new upstream feature, 0 retired, 1 pending
  - pass startup-graph: startup graph, Pi artifact totals, and progress accent re-pinned
  - FAIL parity: /home/runner/work/a1/a1/src/integrations/pi/engine/settings-metadata.ts:45 throw new Error(`Pi settings metadata is not generated at ${url.href}; run npm run build (${describe(error)})`); ^ Error: Pi settings metadata is not generated at file:///home/runner/work/a1/a1/src/integrations/pi/engine/pi-settings-metadata.json; run npm run build (ENOENT: no such file or directory, open '/home/runner/w...
  - pass typecheck: clean
  - pass architecture: clean
  - pass engine-conformance: passed
  - FAIL parity-suites: Validation phase failure evidence could not be written. [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 10 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m [41m[1m FAIL [22m[49m test/repository-governance/deprecated-dependencies.test.ts[2m > [22mdeprecated dependency release policy[2m > [22mallows only the documented exact pinned-Pi transitive exceptions [31m[1mAssertionError[22m: expected 1 to be +0 // Object.is...
- Review items:
  - inventory entry session.missing-cwd: source anchor no longer exists (orphaned)
  - inventory entry resume.missing-cwd.close: source anchor no longer exists (orphaned)
  - 1 feature matrix row is pending a disposition: changelog:1.5.2:fork-sessions-whose-folder-is-gone
  - 70 files still mention 1.5.1 or dd30101: config/baselines/modal-surface-inventory.json, config/baselines/pi-feature-adoption-matrix.json, config/baselines/pi-parity-acceptance.json, config/baselines/pi-session-shell-provenance.json, config/baselines/pinned-pi-command-workflow-outcomes.json, config/baselines/pinned-pi-interactive-baseline.json, config/baselines/pinned-pi-public-api.json, config/baselines/pinned-pi-source-port-ledger.json, config/baselines/presenter-ownership-inventory.json, config/product-identity-legacy-allowlist.json, docs/assets/readme/gears-dark.svg, docs/assets/readme/gears.svg, ...
