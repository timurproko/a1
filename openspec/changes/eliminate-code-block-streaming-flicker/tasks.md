## 1. Reproduce the Regression in Automation First

- [ ] 1.1 Add a deterministic streamed fenced-code workload that opens a fence, accumulates lines containing a relative path and a dotted identifier, closes the fence, and settles; verify it runs through the existing producer and cell replay at a declared geometry with named checkpoints.
- [ ] 1.2 Add a deterministic link-bearing prose workload and a tall-live-tail workload that streams a live block occupying more visible rows than the current stable slack while following an overflowing transcript; verify both report per-checkpoint decision cause and painted-row counts.
- [ ] 1.3 Add budgets that fail on a mid-stream full-screen clear, on a safe movement rejected solely because of link-resembling text, on repaint of stable settled rows, and on a stale final frame; verify the budgets fail against current `develop` and that the captured artifacts name the responsible decision cause.
- [ ] 1.4 Record the failing evidence as the change's baseline artifact, separately labelled from any later remediated run; verify repeated runs are deterministic and that comparison producers stay outside the owned damage path.

## 2. Separate Link Authority

- [ ] 2.1 Report explicitly declared terminal hyperlinks separately from link-resembling text in the row inspection result without changing emitted bytes; verify focused cases for code rows, path rows, declared-hyperlink rows, unclosed sequences, and non-replay-safe content.
- [ ] 2.2 Make movement safety consult explicit hyperlinks and replay safety only, leaving hover cleanup on the link-resembling signal; verify adapter cases prove a code-row transcript region no longer produces an unsafe-content decision while a declared-hyperlink row still does.
- [ ] 2.3 Prove the inspector remains a cleanup detector rather than a link-activation parser and that it derives no transcript semantics; verify architecture and boundary tests still reject broad terminal parsing.

## 3. Bound Hyperlink Cleanup

- [ ] 3.1 Remove the streamed-content signature comparison as a cleanup request site while retaining the pointer-hover transition, deliberate link removal, and discarded-link-state request sites; verify the accepted stationary-pointer and editor link-deletion scenarios still repair host decoration.
- [ ] 3.2 Make a cleanup frame repaint only the rows whose decoration must be overwritten and the rows known stale, without an undeclared erase-display; verify terminal-write and cell-grid tests show no full-screen clear outside initial entry, structural reset, resize, and image-protocol cases.
- [ ] 3.3 Prove cleanup no longer suppresses bounded painting for ordinary streaming and that the cleanup-recovery render is not requested for content-only changes; verify decision-cause coverage for pending cleanup, recovery, and ordinary streaming frames.

## 4. Derive the Damage Allowance From the Live Tail

- [ ] 4.1 Extend the neutral viewport frame descriptor with the visible live-tail extent derived from the owned document layout's live-versus-finalized distinction; verify descriptor validation rejects inconsistent or out-of-range values and that the field derives from no ANSI text or private Pi state.
- [ ] 4.2 Derive the adapter's allowed painted-row count from movement, live-tail extent, the stable-boundary allowance, and counted dock rows, falling back to the existing fixed allowance when the extent is absent; verify one-row, multi-row, absent-extent, and settled-row-regression cases.
- [ ] 4.3 Confirm a settled-row repaint still reports excessive damage and forwards the original pinned write; verify the stable-row budget fails on a seeded regression.

## 5. Regression Gate and Validation

- [ ] 5.1 Re-run the workloads from section 1 and confirm bounded movement for followed code, path-bearing prose, and tall live tails, with no mid-stream full-screen clear in synchronization-honored and synchronization-ignored replay.
- [ ] 5.2 Re-run the existing streaming, selection, hover, dock-reuse, boundary, resize, and detached-scroll coverage and confirm no accepted behavior regressed; verify the existing accepted hyperlink scenarios still pass.
- [ ] 5.3 Run focused typechecking, architecture, viewport, adapter, package-identity, and rendering-evidence checks needed for debugging, then push the implementation branch and use CI as the required full automated gate.

## 6. Exact-Artifact Acceptance

- [ ] 6.1 Provide the exact implementation worktree, branch/commit, build command, deterministic evidence command, and color-preserving `./scripts/dev` and `./scripts/dev pi` comparison steps that stream a long answer containing fenced code, file paths, and one real hyperlink.
- [ ] 6.2 Obtain user-controlled visual acceptance on the exact built artifact in Windows Terminal, recording terminal version and synchronized-update support, and confirming that code blocks settle into readable content without flashing.
- [ ] 6.3 If acceptance fails, retain the evidence, leave the pull request unmerged, and do not weaken the budgets to match a failed visual verdict.
