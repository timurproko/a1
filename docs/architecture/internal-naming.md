# Internal naming and private launch context

Internal code names contain no case-insensitive `a1` substring. This includes constants, variables, parameters, functions, methods, classes, types, private fields, aliases, and quoted/constant-computed member names. Branding remains at supported external boundaries: the `a1` command, public package identity, user-visible text, user directories, public settings, and declared serialized fields.

## Required PR validation

The required **Internal naming validation** job scans complete added, modified, copied, and renamed-to files at the exact PR head against the complete merge-base diff. It does not inspect only changed lines. Policy, exception, ownership, parser-dependency, and selection changes require a full audit and inspector regression tests. A stale, missing, failed, or unexpectedly skipped required result blocks the aggregate development check.

The nightly release workflow runs `full-release`, including `naming-full`, against the entire tracked codebase at its selected source commit. It does not use PR changed-file selection, including when it verifies an already-published immutable package. Naming failure fails platform validation and blocks publication. `naming-selection.test.ts` locks down this nightly wiring and checks that unchanged source is audited.

- Full local audit: `npm run check:names` (tracked files, including staged new files).
- Exact selected PR audit: `npm run check:names:changed` after producing `.artifacts/validation/impact.json`.
- Evidence: `.artifacts/validation/naming.json`, uploaded as `development-naming-validation`.
- Parser fixtures: `test/repository-governance/naming-inspection.test.ts`.
- Git selection fixtures: `test/repository-governance/naming-selection.test.ts`.

TypeScript/JavaScript and Python use syntax trees. Rust uses a token-aware scanner. Workflow environment maps, embedded Node scripts, JSON environment definitions, and supported shell assignments are inspected. Dependencies, immutable vendor files, generated output, and other worktrees are excluded; owned test helpers and locally adapted source ports are not. Unsupported owned inputs fail explicitly. Python inspection uses a bundled development-only grammar, not an installed Python interpreter.

The exact externally branded key/member authority is `config/internal-naming-policy.json`. It records each setting's owner, evidence, exposure, and value semantics. Arbitrary uppercase properties are not public environment settings. No compatibility-alias exposure category is allowed. Test snippets and negative-test input data are not declarations or supported aliases.

## Environment ownership inventory

### Supported branded external settings

| Keys | Producer / consumer and exposure |
| --- | --- |
| `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, `A1_DATABASE_PATH`, `A1_ENDPOINT` | User/shell configuration consumed by `src/foundation/lifecycle/paths.ts`; documented public overrides, unchanged. |
| `A1_PROFILE_HOME` | Caller-supplied profile-home override consumed by `src/features/launch/profile-paths.ts`; exact existing exposure-review entry. |
| `A1_STARTUP_TRACE` | Caller-supplied diagnostic path and trace context in `src/foundation/startup/startup-runtime.ts`; exact existing exposure-review entry. |
| `A1_DEV_INSTANCE_ID`, `A1_DEV_ROOT` | Caller-supplied development overrides consumed by `src/features/launch/development-launch.ts`; exact existing exposure-review entries. |
| `A1_PROCESS_GUARDIAN_PATH` | Explicit executable override in `src/foundation/process-containment/native-guardian-containment.ts`, also configured by CI; exact existing exposure-review entry. |
| `A1_PROBE_TRACE` | Opt-in diagnostics read by native terminal-host code; exact existing exposure-review entry. |
| `A1_BUILD_VERBOSE`, `A1_DEV_SHELL` | Developer invocation controls in the build helper and development launcher; exact existing exposure-review entries. |
| `A1_PANE_ID`, `A1_TERMINAL_SESSION_ID` | Produced by `native/terminal-host/src/workspace.rs` and exported to launched programs; external integration names, unchanged. |

Pending review preserves a possible external interface, not an obsolete private alias. Once a setting is established as private, it cannot keep its branded spelling through that category.

### Current private settings

| Keys | Producer / consumer and value semantics |
| --- | --- |
| `LAUNCH_CONTEXT_RELEASE_ROOT`, `LAUNCH_CONTEXT_RELEASE_ID`, `LAUNCH_CONTEXT_RELEASE_DIGEST`, `LAUNCH_CONTEXT_RELEASE_LAYERS` | Release bootstrap writes the selected verified immutable identity; supervision, guardian, and startup/cache readers consume it. Layers are comma-separated and can be empty. |
| `LAUNCH_CONTEXT_PROFILE` | Bootstrap or the development launcher writes the selected `a1`/`pi` profile; guardian and UI entries consume it. |
| `LAUNCH_CONTEXT_WARMUP` | Release warmup writes exactly `1`; the private warmup entry requires it together with release context. |
| `RELEASE_CLEANUP_HOLDS`, `RELEASE_CLEANUP_RUN_ID` | Cleanup scheduler/worker handoff in `src/foundation/release/release-gc.ts`; serialized holds and a worker run identity. |
| `SOURCE_LEDGER_PATH`, `SOURCE_LEDGER_SCAN_ROOT`, `SOURCE_LEDGER_PORT_ROOT` | Source-ledger governance fixture overrides; produced by its tests and consumed by `check-pinned-pi-source-ledger.mjs`. |
| `RELEASE_RUNNER_LABEL` | Release/full-regression workflows supply certification-runner provenance to `run-release-gates.mjs`. |
| `TERMINAL_FIXTURE_INPUT`, `TERMINAL_FIXTURE_TOKEN` | Native terminal probe producer/consumer in `native/terminal-host/src/main.rs`; expected input and fixture token. |
| `DOCS_AUTO_MERGE_POLL_ATTEMPTS`, `DOCS_AUTO_MERGE_POLL_MS` | Documentation automation polling controls, produced by governance tests and consumed by `manage-documentation-auto-merge.mjs`. |
| `VALIDATION_JOB_STARTED_MS`, `RENDERING_JOB_STARTED_MS` | CI timing handoffs within `.github/workflows/ci.yml`; epoch milliseconds. |
| `RUN_PROCESS_CONTAINMENT_INTEGRATION` | CI enables the real containment fixture with exactly `1`; platform containment tests consume it. |
| `PACKAGE_MESSAGE_SCENARIO` | Package-message worker parent/child JSON scenario handoff. |
| `RECOVERY_TEST_CANCEL_AFTER`, `RECOVERY_TEST_REMOVAL_MARKER` | Recovery test parent/fake-npm handoff; mutation index and disposable sentinel path. |

The private launch contract is `neutral-launch-v1`, declared by the package's `privateLaunchContract` metadata and bound into immutable release identity. It is validated before activation or execution. There is one reader/writer and no mapping from obsolete private names.

### Existing neutral automation and third-party boundaries

These names are already neutral; their definitions and consumers remain the authority for their existing behavior:

- Development aggregate: `CHANGES_RESULT`, `DOCS_RESULT`, `DOCUMENTATION_RESULT`, `DOCUMENTATION_REQUIRED`, `VALIDATE_RESULT`, `CONTAINMENT_RESULT`, `STARTUP_RESULT`, `RENDERING_RESULT`, `RENDERING_TIER`, `DOCS_ONLY`, `VERSION_ONLY`, `OPENSPEC_TOUCHED`, `SELECTED_HEAD`, `EXPECTED_HEAD`, `EVENT_BASE_SHA`, `EVENT_HEAD_SHA`. The workflow produces these and `require-development-validation.mjs` or the selector consumes them.
- Naming aggregate: `NAMING_RESULT`, `NAMING_REQUIRED`, `NAMING_HEAD`, produced by CI and consumed by the same required aggregate.
- Validation: `VALIDATION_BUILD_READY`, `VALIDATION_CANDIDATE_TARBALL`, `VALIDATION_DOCUMENTATION_FULL_READY`, `VALIDATION_SELECTION_JSON`, `STARTUP_PERFORMANCE_RESULT`, owned by validation orchestration and exact-package fixtures.
- Publication workflow-local handoffs: `BUILD`, `EVENT_NAME`, `EXISTS`, `EXPECTED_INTEGRITY`, `EXPECTED_REGISTRY_INTEGRITY`, `EXPECTED_REGISTRY_SHASUM`, `EXPECTED_SHASUM`, `MODE`, `PACKAGE`, `PLAN`, `PUBLISH`, `PULLS_PATH`, `PULL_REQUEST`, `REGISTRY_TARBALL`, `RELEASE_CHANNEL`, `RELEASE_VERSION`, `REQUESTED_CHANNEL`, `REQUESTED_SHA`, `SOURCE_SHA`, `VALIDATE`, `VERSION`, `WORK`, defined and consumed in `.github/workflows/release.yml`.
- Isolated fixture controls: `PROMPT_SUGGESTION_AGENT_DIR`, `RUN_PROMPT_SUGGESTION_PROVIDER_TEST`, `TEST_SUPERVISOR_SECRET`, owned by their specific provider/supervisor tests.
- Host/tool integration: `CARGO`, `ZIG`, `PATH`, `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, XDG directory variables, `TERM`, `COLORTERM`, `TERM_PROGRAM`, `WT_SESSION`, `EXEPATH`, `MINGW_PREFIX`, `MSYSTEM`, and third-party `PI_*`, `GITHUB_*`, `GH_TOKEN`, and npm variables. Their external spellings and caller values are not private product naming targets. The forwarding of an arbitrary user's environment is distinct from defining an owned setting.

### Removed or reclassified registry entries

The old environment registry included `fixture` and `inputAcknowledgement`, but their values describe native probe stdout markers, not environment settings. Their existing external wire spellings stay in that protocol, not in the public environment registry.

`certificationTarball`, `internalPackaging`, `nativePi`, `piParityIntentionalMutation`, `protocolVersion`, `structuredFlowLimits`, `terminalArgumentsJson`, and `terminalExecutable` had no active runtime consumer in the reviewed tree. They are removed from the current environment authority, not renamed into new settings. Rejection patterns and immutable historical evidence remain factual.

## Negotiated handoff and protected state

An update is performed by the release that is already installed, so the contract is negotiated rather than cut over. `neutral-launch-v1` is the only contract this build **writes** for its own releases, and the superseded `A1_RELEASE_*`/`A1_IMMUTABLE_WARMUP` keys are still **read** when an older launcher starts this build, and still **written** when this build starts a retained release that declares no contract. An installation therefore stays launchable across the cutover in both directions, and no user is asked to stop processes and reinstall by hand.

Metadata that predates contract declaration is stale, never fatal. A pre-cutover active record does not stop a launch: it is ignored, the installed payload is materialized, and ordinary cohort selection activates it. A launch that cannot take the installed payload at all — an installation being replaced right now — starts the retained active release instead of failing, and leaves activation to the next launch. What still requires `neutral-launch-v1` outright is narrow and never blocks a launch: the installed package's own manifest must declare it, and an update recovery capsule is never translated.

`test/foundation/release/update-predecessor.integration.test.ts` is the gate for this. It installs each of the most recent published releases and drives the candidate through **that release's own** materialization and warmup, because a fixture built from the candidate would only prove the candidate agrees with itself. No reset or migration runs automatically. If disposable state blocks installation, inspect its resolved paths and obtain separate approval before removal.

| State | Treatment |
| --- | --- |
| `<configDir>` and its settings | Preserve. |
| `~/.a1/agent`, credentials, extensions, and session files | Preserve. |
| Prompt-history databases under the selected data/history owner | Preserve; this change does not relocate history. |
| `<dataDir>/releases`, release references/certification records, `<dataDir>/update-recovery`, update journal | Disposable runtime/release candidates only; inspect exact paths and live ownership before any separately approved manual reset. |
| `<runtimeDir>` endpoints, locks, and worker records | Reset candidates only after all affected processes stop and their precise scope is confirmed. |
| The whole `<dataDir>` or `<configDir>` | Never delete as a shortcut: disposable and user data can share these roots. |

`test/foundation/launch-context/cutover.test.ts` places protected settings/session/history sentinels next to incompatible runtime fixtures and verifies failed admission does not change them. No test or implementation command uses actual user data as its cleanup fixture.
