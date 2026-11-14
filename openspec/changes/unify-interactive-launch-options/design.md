# Delivery P1: shared default CLI and guarded session services

## Authorization and partition

The user approved Pi-style bare positional prompts for ordinary A1 and the four dependent deliveries, and explicitly requested implementation. Continue PR #928, branch `feature/shared-interactive-launch`, change `unify-interactive-launch-options`. This authorizes implementation, not integration or deployment. The full target remains the documented Pi 1.5.2 contract with all applicable A1 features, no compatibility toggle and no second runtime.

[delivery-plan.md](delivery-plan.md) preserves the complete expanded plan. [contract-inventory.md](contract-inventory.md) is the common versioned inventory. The approved sequence is P1 shared CLI/session/model/trust; P2 tools/resources/maintenance; P3 machine/programmatic transports; P4 extension/UI/product conformance. Future normative drafts are retained under `future-specifications/`, outside this delivery's active spec deltas. Subsequent PRs start from current integrated develop; no hidden stacked dependency or unauthorized merge.

P1 has two implementation outcomes, matching tasks.md and this PR's two markers. Later contract rows remain explicitly pending. They must fail usefully when requested, never be accepted and ignored, and never be described as full parity. This partition does not reinstate the former permanent interactive-subset exclusions.

## Approved grammar refinement

Both normal-product names accept positional prompts and `--`. Leading recognized A1 control namespaces retain their handlers; the Pi naming adapter reserves pinned maintenance namespaces, with no machine uninstall when a source is missing. A leading update invokes the existing verified A1 product updater, not an independent embedded-engine update. A boundary makes reserved words literal. Once execution parsing starts it never returns to control dispatch. Multiple positional messages retain order; malformed recognized controls never become prompts. Bare words are now prompts, so an arbitrary misspelled word cannot simultaneously be detected as a command typo; reserved removed forms remain explicit errors.

Use one CLI normalizer, not a copy of the compatible parser. Unknown syntactically valid long flags require a loaded extension registration; unknown short flags and internal `--runtime-options` fail publicly. Core flags reserved for P2/P3/P4 must fail with a clear pending-delivery diagnostic rather than become extension flags. Help advertises actual delivered support and distinguishes pending contracts. Factory-free help/version and Firstmate catalog refusal are retained. Default output selection/print/JSON/RPC, file/image/stdin processing and large-input transport belong to P3: P1 must not claim them complete or silently interpret their syntax as literal prompt data.

## Ownership and transport

Retain normal A1 intent/bootstrap/guardian, original cwd, profile selection, captured runtime identity and #927's API lifecycle. Extract public options from internal child payload parsing. New structured fields are validated by neutral transport and consumed only by their owner; authenticated selected-release capability checks must refuse old releases that cannot consume them. Never shell-concatenate prompts or persist invocation credentials. Extend existing composition startup delivery for ordered messages without replaying prompts on repeated flush/replacement.

Concrete catalog/profile/bootstrap/maintenance wiring is shared by shipped entries, with no engine imports in CLI policy. Supported development routing uses the same parsed requests. Normal global profile remains A1's; no borrowing standalone Pi credentials. Explicit root override policy and unavoidable safety differences not resolved by the two approvals remain visible decisions, not permission to weaken isolation.

## Outcome 1: shared CLI/discovery

Unify existing interactive options, path/source normalization, extension flags, model/provider/thinking/exclusions, session/color/storage, command boundaries and shared help/catalog. Add Pi-style bare and ordered positional messages to both entries. Reserve future documented controls/options and fail usefully. Keep internal child payload syntax inaccessible publicly. Spawn both public entries for safe probes/errors/catalog; compare intents and actual startup message order with existing deterministic composition fixtures. Include dependency-light help, Firstmate refusal and no accidental maintenance through prompts.

## Outcome 2: guarded session/model/trust

Extend the existing SDK construction/selection owners for continue/resume/fork/custom IDs/name/in-memory sessions, storage/cwd precedence and selector conflicts. Preserve canonical file writer ownership on every persistent path, failure, replacement and disposal. No-persistence uses the real in-memory identity, never a fabricated JSONL. Actual storage-dependent product operations must fail explicitly rather than dereference a missing session file or silently persist a session.

Add model scopes and invocation credential/effort precedence without saved-default or account changes; credentials may not enter release evidence, settings or diagnostics. Add process-only trust overrides and the documented global/CLI extension trust decision before project resources, preserving fail-closed headless behavior and effective-cwd trust. Reuse public SDK managers and resource-loader hooks; do not run upstream CLI or deep-import private distribution modules.

Tests accompany each implementation outcome. O2 uses actual SDK services, disposable managers/history/auth/trust and two-entry parsing/transport fixtures. Session picker/cwd decisions must use existing owned presentation ports, never create a second terminal renderer. Where no UI exists, selection must fail explicitly without guessing.

## Validation and truthful progress

Deliver code and tests for outcome 1, tick its detailed tasks, commit/push and tick only its PR marker before starting outcome 2. Repeat for outcome 2; trusted automation owns readiness/finalization. Focused changed-owner tests, typecheck, strict OpenSpec and applicable architecture checks only; broad suites remain CI-owned. No live providers, Firstmate workers, uploads, global install, desktop automation or deployment.

Report implemented contract rows and exact evidence separately from pending P2–P4, external Firstmate lifecycle and bug-report destination/public-facility prerequisites. Common inventory rows are not verified merely because a parser accepts a flag or a historical test exists. Current task dependency installation must use pinned 1.5.2, not primary's stale dependencies.
