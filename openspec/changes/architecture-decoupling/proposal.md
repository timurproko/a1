# Proposal

## Why

The layer map in `docs/architecture/boundaries.md` is sound and the architecture gate enforces its structural parts, but the code that landed under it has drifted in three ways that now slow every change.

**The application layer is welded to the Pi integration.** `src/app/session-shell` has 65 import edges into `src/integrations/pi`; 26 of its 50 files import Pi modules directly, and they import values, not only types: `piTheme`, `createPiShellEditor`, `createPiShellDialog`, `createPiShellSelector`, `ProgramStatusReporter`, `PiTuiRuntimeAdapter`, `classifyPiTuiInput`, `workflowCommandNames`. Six modules outside the adapters import the vendored `upstream/theme/theme.ts` by path. The project-structure policy exempts the shell from the "features do not import Pi adapters" rule, and the exemption became the norm. A Pi upgrade or a presentation change touches the shell, not just the adapter.

**Five classes have become god objects.** The size ratchet records `OwnedUiSessionShellRoot` at 85 methods / 32 fields, `OwnedUiSessionPresenter` at 77 / 52, `PiTuiRuntimeAdapter` at 56 / 26, `SettingsApp` at 42 / 28, and `PiEngineAdapter` at 42 / 21 against thresholds of 20 / 15. The presenter's constructor is about 350 lines of inline wiring that builds clipboard transports, image readers, and the render root in place. These five files are also the five most-changed source files of the last ninety days, so every feature lands in them. Alongside this, three theme modules are imported widely (`ui/components/theme.ts`, `integrations/pi/components/theme.ts`, and the vendored theme it re-exports whole), a generated palette module exists twice byte-for-byte, the bare/comparison profile decision branches in 15 files, 146 exported symbols have no consumer anywhere, and 71 more are exported only so tests can reach them.

**The test and governance apparatus is larger than the product.** Source is 62,849 lines in 320 files; tests are 87,270 lines in 454 files. `test/repository-governance` alone is 147 files and 18,513 lines; 113 of those files test the governance scripts, 9 assert literal sentences in Markdown documents (`change-delivery-guidance.test.ts` carries 218 `toContain` checks on prose), and 44 pin JSON baselines that the scripts already verify. Those tests are also the fragile ones: on a clean `develop` checkout on Windows, 18 governance files fail because they compare file text containing `\r\n` against `\n` literals or against a ledger hash that drifted. Session-shell behaviour is spread across 15 `session-shell*.test.ts` files (9,675 lines) on one 427-line fixture; 77 test files spawn workers or child processes; and the contracts and UI foundations, the most deterministic code in the tree, carry 7 mocks between them while `test/app` and `test/integrations` carry 494. The contracts, UI, CLI, and composition suites run 815 tests in 22 seconds; the governance suite alone takes 165 seconds.

This change makes the architecture match its own documentation, splits the classes that absorb every feature, and reduces the test suite to what proves product behaviour and the gates.

## What Changes

- **Governance tests shrink to the gates.** Each governance script keeps one fixture-driven test that proves it fails on a violating input and passes on a conforming one. Tests that assert sentences of documentation, workflow YAML, or `openspec/config.yaml`, and tests that re-check a JSON baseline a script already checks, are removed; any invariant they carried that is still wanted moves into the script that owns it. Governance tests read files with line endings normalised so they pass on every checkout.
- **The shell depends on neutral presentation ports.** A `ShellPresentationPorts` contract in `src/contracts/owned-ui` covers what the shell takes from Pi today: theme roles and the canvas background, the editor factory, dialog and selector factories, the program-status reporter, input-surface classification, hyperlink and width helpers, and workflow command names. `src/integrations/pi/session-presenters` implements it, composition injects it, and the project-structure policy forbids any `src/app` import of `src/integrations/pi` with no exemption.
- **One theme contract.** `src/ui/components/theme.ts` becomes the only theme module imported outside the Pi adapters; the adapter maps `piTheme` into its roles and subscribes to theme changes on the shell's behalf. The vendored theme is no longer re-exported whole. The duplicated `progress-palette.generated.ts` becomes one generated module with one consumer entry.
- **Profile capabilities are resolved once.** Composition turns the bare/comparison decision into one `ProductSurfaces` record (owned surfaces, startup changelog, theme base, prompt limits, collapsed skills, repository context) and passes it as data. No module outside composition reads `ownedSurfaces` or `productMode`.
- **The session shell is split by concern.** Clipboard and copy transport construction moves to composition. The presenter keeps coordination only; transcript, dock, workflow output, and extension surface each own their state behind the existing `SessionConcern` lifecycle. `OwnedUiSessionShellRoot` becomes a thin root over those components. `SettingsApp` is split into list state, key dispatch, undo, and rendering. `PiTuiRuntimeAdapter` and `PiEngineAdapter` lose the methods that only forwarded to a collaborator. Every touched ratchet entry shrinks or disappears.
- **Dead and test-only exports go.** The 146 unused exports are removed; the 71 test-only exports become module-private and their tests reach behaviour through the owner's public entry. The 15 session-shell test files are merged into one file per concern that mirrors the split above, moving cases verbatim and keeping the resource-sensitive partition correct.
- **Pre-pivot residue is removed.** The single-agent pivot deleted the resident-tab, native terminal-host, supervisor, and launch-guardian code but left its outline behind: five hollow capability specs (`multi-agent-tabs`, `resident-terminal-host`, `resident-tab-reliability`, `agent-supervision`, `launch-instance-lifecycle`) plus the `terminal-agent-runtime` transparent-terminal spec and four transparent or physical-host requirements in `isolated-regression-testing`; about 100 lines of architecture-gate rules that reject class names, directories, and cadence inference that no longer exist, with a 223-line test for them; the unused `node-pty` devDependency; the direct-versus-resident `interaction-parity` matrix; Rust and Zig handling in the size ratchet, documentation policy, identity inventory, and cleanup scripts; a settings migration chain that introduces and then retires tab-bar, time-format, and update-notify settings; and supervisor-era names (`cohort`, `no-live-supervisor`, `supervisor-verified`, "resident host" identities) in release, startup, and naming-policy files. The specs, guards, dependency, scripts, and fixtures are deleted; the gate keeps only the three-line "no PTY or terminal emulator under `src/`" rule; the migration chain collapses to its end state; and the names are reconciled, with the persisted `a1-release-cohort-v1` schema id kept and documented as a legacy identifier.
- **Unchanged.** The pinned Pi version, the ledger and upstream sync, the three Pi adapters' responsibilities, the owned UI's behaviour, the validation tiers, the delivery workflow, and every user-visible feature.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `owned-ux-architecture`: the application layer reaches vendor presentation only through neutral ports; one theme contract is consumed outside the vendor boundary; profile capabilities are resolved once in composition.
- `project-structure-governance`: the shell's layer rule loses its Pi-adapter exemption; governance tests prove gates through fixtures rather than prose; a production export needs a production consumer; the transparent-baseline scope requirement is removed.
- `isolated-regression-testing`: the physical-host automation, transparent manual-first, transparent physical-evidence, and raw-relay requirements are removed.

### Removed Capabilities

- `terminal-agent-runtime`: the transparent terminal capability has no production owner since the pivot.
- `multi-agent-tabs`, `resident-terminal-host`, `resident-tab-reliability`, `agent-supervision`, `launch-instance-lifecycle`: the single-requirement stubs left by the pivot are removed; the one "SHALL NOT" each carried is already stated by `a1-shell` and `launch-profiles`.

## Impact

- **Contracts:** `src/contracts/owned-ui` gains `ShellPresentationPorts` and `ProductSurfaces`; `src/ui/components/theme.ts` gains the roles the shell needs.
- **Integration:** `src/integrations/pi/session-presenters` implements the new ports; `shell-shared-facade.ts` is dissolved into the owners of its exports; the vendored theme re-export is removed.
- **Application:** every file under `src/app/session-shell` that imports `integrations/pi` changes to the ports; the presenter, root, and settings app are split.
- **Composition:** `owned-ui.ts` builds `ProductSurfaces`, the presentation ports, and the clipboard transports.
- **Governance:** `project-structure-policy.mjs` loses the shell exemption and gains the production-consumer export rule; `size-ratchet.json` shrinks.
- **Residue:** six capability spec directories are deleted and two specs lose their transparent requirements; `check-architecture.mjs` loses its retired-mechanism, transparent-boundary, terminal-identity, and parity-boundary rules; `node-pty` leaves `package.json`; `scripts/development/interaction-parity` is deleted; Rust and Zig handling leaves `size-ratchet-policy.mjs`, `code-documentation-policy.mjs`, `product-identity-inventory.mjs`, and the local-cleanup scripts; `migrations.ts` collapses to its end state; `startup-budget.ts`, `update-transaction.ts`, `cohort-state.ts`, and `internal-naming-policy.json` lose supervisor-era names.
- **Tests:** `test/repository-governance` drops to roughly one file per script; `test/app/session-shell` is reorganised per concern; test-only seams are removed.
- **Users:** no visible change. The package shrinks slightly and CI runs faster.
