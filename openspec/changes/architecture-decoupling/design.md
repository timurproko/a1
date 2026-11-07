# Design

## Context

The repository documents a layered architecture: contracts at the bottom, vendor-neutral UI components and features above them, three Pi adapters behind neutral contracts, an application-layer session shell, and one composition root. `scripts/governance/check-architecture.mjs` enforces owners, the DAG, three layer boundaries, startup reachability, and a size ratchet. The measurements below were taken on `develop` at `9f0307c0` and are the baseline this change is judged against.

| Measure | Value |
|---|---|
| `src/app/session-shell` → `src/integrations/pi` import edges | 65 (26 of 50 files) |
| Modules outside adapters importing `upstream/theme/theme.ts` | 6 |
| Files branching on `ownedSurfaces` / `productMode` | 15 |
| Exports with no consumer / with test-only consumers | 146 / 71 |
| Source lines / test lines | 62,849 / 87,270 |
| `test/repository-governance` files / lines | 147 / 18,513 |
| Governance files testing scripts / docs prose / baselines | 113 / 9 / 44 |
| Governance files failing on a clean Windows checkout | 18 (CRLF and ledger drift) |
| Session-shell test files / lines | 15 / 9,675 |
| Suite times: contracts+ui+cli+composition / governance | 22 s (815 tests) / 165 s (1,512 tests) |

## Goals / Non-Goals

**Goals**

- `src/app` imports nothing from `src/integrations/pi`, enforced without exemption.
- One theme authority outside the adapters; one generated palette.
- The bare/comparison decision is one value built once.
- No class under `src/` that this change touches remains above the ratchet thresholds unless its entry shrinks and the remaining size is explained in the design.
- No governance test asserts the wording of documentation, workflow files, or project configuration, or the text of production source; governance tests pass on every operating system's checkout.
- Every exported production symbol has a production consumer or is removed.
- No spec, gate rule, dependency, script, migration step, or identifier exists only because of the resident-tab, native terminal-host, supervisor, or transparent-terminal architecture.
- The whole fast tier is faster than before; no behaviour the owned UI shows today changes.

**Non-Goals**

- Changing the pinned Pi version or the vendored ports under `upstream/`.
- Redesigning any screen, shortcut, or setting.
- Reworking the delivery workflow, CI tiers, or the governance scripts' own policy beyond what their tests move into them.
- Removing the size ratchet, the owner DAG, or the startup-graph gate.

## Decisions

### 1. Delete prose tests; keep one fixture test per gate

A governance script is a function from repository bytes to a verdict. The test that proves it is a fixture directory that violates the rule, a fixture that satisfies it, and an assertion on the verdict. Tests that instead assert sentences of `docs/*.md`, workflow YAML, or `openspec/config.yaml` do not test the product or the gate; they freeze wording, break on line endings, and have to be edited whenever a sentence is rephrased. They are removed outright. Where such a test carried a real invariant (for example "the publish workflow has no npm token"), that invariant becomes a check inside the owning governance script, which already runs in CI, and its one fixture test grows a case. Baseline JSON files stay, because scripts read them; the tests that re-parsed those baselines to assert their contents go.

Alternative considered: keep the prose tests and normalise line endings. Rejected because it preserves the cost of maintaining tests that describe documents.

Implementation finding: a per-case inventory showed that 105 of the 147 governance files are ordinary unit tests of one script each, so the suite was already close to one file per script and needs no consolidation. The removable part was 21 files and about 2,250 lines: prose assertions on Markdown and workflow YAML, source-shape tests that grep production code for exact strings, and one research record with no checker. Assertions that protect privileged-workflow security (no pull-request-head code under `pull_request_target`, scoped App tokens, immutable action pins) are kept, because they guard a real attack surface rather than wording. The one such invariant held only by a deleted file, "npm publication uses no long-lived registry token", moved into `github-repository-governance.mjs` as an `npm-token-publication` authority that the reviewed definition never lists.

Implementation finding: the Windows failures were not test bugs. The repository had no `.gitattributes`, so a checkout with `core.autocrlf=true` received CRLF text and every hash ledger and text comparison disagreed with CI. One `.gitattributes` with `* text=auto eol=lf` fixes all of them at the source; `ci.yml`, which had been committed with CRLF, is renormalised. Five governance files that remain timing-sensitive under full-suite load on Windows pass in isolation and are unchanged by this work.

### 2. A ports contract for what the shell takes from Pi, not a general facade

The shell today reaches into the adapters for a dozen concrete things. The contract names exactly those: theme roles plus the canvas background colour and a change subscription, `createEditor`, `createDialog`, `createSelector`, `statusReporter`, `classifyInput`, `hyperlink`, `truncateToWidth`, `visibleWidth`, and `workflowCommandNames`. It is a record of ports, typed with existing neutral types where they exist (`PresentationComponentPort`, `UiRouteHost`) and new neutral types where the shell today uses `PiShell*` or `PiTui*` types. `src/integrations/pi/session-presenters` already is the one owner allowed to import both the engine and the component adapters, so it implements the record; composition injects it through `OwnedUiSessionShellOptions.presentation`. `shell-shared-facade.ts`, a 41-export module with fan-in 37, is dissolved: each export moves to the module that owns the behaviour, and the ones the shell needed move behind the ports.

Alternative considered: keep direct imports but restrict them to types. Rejected because type-only coupling still ties the shell's vocabulary to Pi and does not stop the next value import.

Refinement approved during implementation: measuring after the theme work showed about 100 distinct Pi symbols across 26 files, and that `shell-host.ts` constructs the Pi TUI runtime and damage-aware terminal directly. The terminal host therefore moves into `src/integrations/pi/tui-runtime` behind a neutral terminal-host contract; the neutral port and value types move into `src/contracts/presentation`; and the remaining factories ride on `ShellPresentationPorts`, which lives in `src/contracts/presentation` (UI components may import only that contract) and which `createPiSessionPresenters` already returns.

### 3. One theme contract

`src/ui/components/theme.ts` already defines `UiTheme` with roles. It gains the few roles the shell paints that are missing (canvas background, hyperlink, status levels) and a `ThemeSource` port with `current()` and `onChange()`. The Pi component adapter implements `ThemeSource` from `piTheme`. `integrations/pi/components/theme.ts` stops re-exporting the vendored theme and keeps only Pi-facing helpers. The two identical `progress-palette.generated.ts` files become one under `src/ui/settings`, generated once, with `foundation/release` receiving the palette through its existing options rather than importing UI.

### 4. The product mode has one name

Refinement approved during implementation: `productMode` (`bare` or `comparison`) is already decided once and is the engine host's single input, which the Pi engine adapter legitimately interprets for vendor-specific behaviour. The duplication was four spellings of the same decision at the app boundary: `ownedSurfaces` as `"on" | "off"` in launch selection and as a boolean in composition and the startup route, the trust prompt's `presentation`, and the shell re-deriving the mode from its layout. All of them become `productMode` with one type, and the shell reads it from the backend's settings port. A `ProductSurfaces` record was rejected because it would add an abstraction threaded through eight engine classes without removing a decision.

### 5. Split along the seams the code already names

The presenter already lists its concerns in `#createConcerns` and the root already delegates to `TranscriptDocument`, `DockChrome`, `WorkflowOutput`, `ExtensionSurface`, and `InputSurfaceSwitch`. The split finishes what those names promise:

- Clipboard transport, copy executor, image reader, and paste preparation construction move to `src/composition/clipboard.ts` and arrive as one `ClipboardServices` port. The presenter constructor becomes a sequence of concern constructions and one `constructed` release list.
- Methods on the root that only forward to a component (`setExtensionWidget`, `appendWorkflowStatus`, `setViewportConfig`, and the like) are removed; callers hold the component's port. The root keeps layout selection, part assembly, and render.
- `SettingsApp` becomes `SettingsListState` (rows, selection, filter, scroll), `SettingsKeyDispatch` (the three key handlers behind the shortcut declaration), `SettingsUndo`, and `SettingsRenderer`; `SettingsApp` composes them and implements `UiApp`.
- `PiTuiRuntimeAdapter` loses forwarders that re-export `TUI` methods one-to-one; the shell calls the terminal port. `PiEngineAdapter` moves announcement and catalog concerns to the ports it already builds in `ports.ts`.

Each split is a separate commit so the ratchet entry shrinks per commit and a reviewer can read one seam at a time.

### 6. Production exports have production consumers

A new rule in `project-structure-policy.mjs` fails when an exported symbol under `src/` has no importer under `src/`, `bin/`, or `scripts/`, excluding owner public entries, declared entry modules, and `upstream/`. The 146 dead exports are deleted and the 71 test-only exports become private, with their tests rewritten against the owner's public entry or deleted when a stronger test already covers the behaviour. Tests keep access to constants they genuinely need through the public entry, not through a second export surface.

### 7. One test file per concern, cases moved verbatim

The 15 `session-shell*.test.ts` files are merged into files named for the concerns of decision 5 (`presenter`, `transcript`, `dock`, `workflow-output`, `extension-surface`, `clipboard`, `paste`, `selection`, `viewport`, `lifecycle`). Cases move unchanged; the shared fixture stays one module. Files that fork helpers stay in the resource-sensitive partition, and `config/validation-suites.json` names the parts that inherit that cost. The audit after the merge reports the same passing case count as before.

### 8. Remove the pivot's outline, not just its code

The single-agent pivot deleted the resident-tab, terminal-host, supervisor, and guardian implementations but left the shape of them behind. A scan of the tree (excluding archives and vendored code) finds the residue in five groups:

- **Specs.** `multi-agent-tabs`, `resident-terminal-host`, `resident-tab-reliability`, `agent-supervision`, and `launch-instance-lifecycle` are 14-line stubs with one negative requirement each; `terminal-agent-runtime` (8 requirements) specifies a transparent terminal that has no production owner; `isolated-regression-testing` carries four transparent or physical-host requirements and `project-structure-governance` a transparent-baseline scope requirement. These are deleted. The single-agent statements they carried already live in `a1-shell` and `launch-profiles`.
- **Guards for deleted code.** `check-architecture.mjs` rejects `src/foundation/transparent-terminal/`, `src/drivers/terminal`, `src/host-terminal`, named retired classes (`PtyTerminalDriver`, `TerminalModeTracker`, `SemanticTerminalInput`), cadence inference, CLI identity in "terminal boundary" paths, and terminal-parity capture, and `terminal-architecture-policy.test.ts` tests those rules. All of it reduces to the one rule that still protects a live invariant: no module under `src/` imports `node-pty`, a terminal emulator, or spawns a pseudoterminal. Governance tests that assert the absence of `rustup`, `setup-zig`, `cargo`, `build:terminal-host`, or `bin/supervisor.js` go with the prose tests in decision 1.
- **Dependencies and scripts.** `node-pty` has no importer. `scripts/development/interaction-parity` compares direct and resident interaction and is consumed only by one parity-oracle test and its recorder, so both go. `size-ratchet-policy.mjs` loses `maskRust`, `rustScopeName`, and the `native/<crate>/src/` root; `code-documentation-policy.mjs` loses `.rs`/`.zig`/`.c`/`.h` classification; `product-identity-inventory.mjs` loses the native-names class; `local-cleanup-git.mjs` and `local-cleanup-state.mjs` lose the Cargo target roots and their tests.
- **Compatibility shims.** `migrations.ts` has 19 steps, 8 of which introduce and then retire tab-bar, time-format, and update-notify settings. They collapse into one step that maps any pre-pivot document to the current shape; the existing migration tests prove the same end state from the same starting documents. `LEGACY_FINAL_PHASE = "supervisor-verified"` in `update-transaction.ts` stays as a one-line reader for old transaction files and gains a comment naming it legacy.
- **Names.** `cohort-state.ts` is the release store; it is renamed `release-state.ts` with `ReleaseStateStore`, while the persisted schema id `a1-release-cohort-v1` is kept and documented as a legacy identifier because changing it would invalidate installed state. The `no-live-supervisor` launch kind becomes `cold`, with the CI startup evidence key and trend script updated together. `internal-naming-policy.json` entries described as "the resident host does not currently emit it" are removed with their identities, and `product-identity-legacy-inventory.json` is regenerated so no entry points at a deleted file. Comments that say "solo", "utility tab", or "terminal host" in the resident sense are rewritten.

Alternative considered: leave the stubs and guards as documentation of what must not come back. Rejected because the Git history and the archived pivot change already record that, and every guard is code the next reader must understand and the gate must run.

## Risks / Trade-offs

- **Churn in the shell.** Twenty-six files change imports. Mitigation: the ports contract lands first with the Pi implementation and the shell switches file by file; the architecture gate's new rule is enabled last, once the edge count is zero.
- **Lost invariants from deleted governance tests.** Mitigation: each deleted file is reviewed for a rule not already in a script; such rules are listed in the task that moves them, and the fixture test gains a case.
- **Size ratchet friction.** Splitting classes creates new classes that may themselves exceed thresholds mid-series. Mitigation: ratchet entries are updated per commit with `update-size-ratchet.mjs`; a new class above threshold is split further rather than recorded.
- **Collapsing migrations.** An older profile document must still land on the current shape. Mitigation: the existing migration tests keep their pre-pivot starting documents and assert the same end state against the collapsed chain before the old steps are deleted.
- **Renaming the release store.** Installed state carries `a1-release-cohort-v1`. Mitigation: only the module and class are renamed; the schema id is unchanged and documented as legacy in `internal-naming.md`.
- **Behaviour drift during the settings split.** Mitigation: the existing `settings-app.test.ts` (68 cases) runs unchanged against the composed `SettingsApp` before its cases are redistributed.

## Migration Plan

Order of landing within the one PR, each step green on typecheck and its own tests:

1. Governance test reduction and line-ending normalisation (no production change).
2. Theme contract and palette de-duplication.
3. One name for the product mode.
4. `ShellPresentationPorts` contract, Pi implementation, composition injection; shell files switch to the ports; policy rule enabled.
5. Clipboard services to composition; presenter and root splits.
6. `SettingsApp`, `PiTuiRuntimeAdapter`, `PiEngineAdapter` splits.
7. Dead-export rule and removals; session-shell test merge.
8. Pre-pivot residue: specs, guards, `node-pty`, interaction-parity, Rust handling, migration collapse, renames.

No data, settings, or release migration is involved; the package's behaviour and surface are unchanged.

## Open Questions

- Whether `progress-palette.generated.ts` should live under `src/ui/settings` or in a new `src/contracts/presentation` leaf so `foundation/release` never imports from `ui`. The default is a contracts leaf; the task records the choice.
- Whether the test-only constants in `quit-outro.ts` and `automatic-update.ts` are worth exposing through a `testing` sub-entry or whether those tests should assert on observable timing instead. The default is observable timing.
