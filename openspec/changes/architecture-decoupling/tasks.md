# Tasks

## 1. Governance tests shrink to the gates

- [ ] 1.1 Inventory every file under `test/repository-governance` into one of: fixture test of a script, prose assertion on documentation or workflow text, baseline re-check, other. Record the inventory and the invariants worth keeping in `.artifacts/` during the work and in the task notes of this file when done.
- [ ] 1.2 Delete the prose-assertion files (`change-delivery-guidance`, `ci-release-runbook`, `release-pipeline-policy`, `pi-upstream-sync-workflow`, `ready-pull-request-refresh`, `full-regression-policy`, `impact-aware-validation-workflows`, `documentation-auto-merge`, `openspec-archive-workflow`, and any other file whose assertions are `toContain` or `toMatch` on `.md`, `.yml`, or `openspec/config.yaml` text). For each invariant worth keeping, add a check to the owning script under `scripts/governance` or `scripts/release` and a case to that script's fixture test.
- [ ] 1.3 Delete the baseline re-check files that parse `config/baselines/*.json` or `config/*.json` to assert their contents when the owning script already verifies them; keep the script's fixture test.
- [ ] 1.4 Consolidate the remaining script tests to one file per script, each with a violating and a conforming fixture under `test/repository-governance/fixtures`; read fixtures and repository files with line endings normalised so the suite passes on Windows checkouts; move process-spawning cases to the resource-sensitive partition or replace them with direct calls to the script's exported `main`.
- [ ] 1.5 Update `config/validation-suites.json`, `config/validation-ownership.json`, and the integration-owner registry so every retained file is named once and no removed file is referenced; verify the architecture, naming, and documentation checks still pass.

## 2. One theme contract

- [ ] 2.1 Extend `src/ui/components/theme.ts` with the roles the shell paints today (canvas background, hyperlink, status levels, selection) and a `ThemeSource` port exposing `current()` and `onChange()`; verify with a declarations test on the role set.
- [ ] 2.2 Implement `ThemeSource` in `src/integrations/pi/components` from `piTheme` and `onPiThemeChange`; stop `integrations/pi/components/theme.ts` re-exporting the vendored theme whole and keep only Pi-facing helpers; verify the theme mapping with a test per role.
- [ ] 2.3 Replace every `upstream/theme/theme.ts` and `piTheme` import in `src/app`, `src/composition`, and `src/features` with the `ThemeSource` port supplied through options; verify the architecture check rejects a new direct import.
- [ ] 2.4 Collapse the two identical `progress-palette.generated.ts` modules into one generated module in a contracts leaf; `foundation/release` and `ui/settings` import it from there; update the generator script and verify the generated file is reproducible.

## 3. Profile capabilities are resolved once

- [ ] 3.1 Add a `ProductSurfaces` record to `src/contracts/owned-ui` with fields for owned surfaces, startup changelog, theme base, prompt image limit, collapsed skills, and repository context; composition builds it once in `owned-ui.ts`.
- [ ] 3.2 Replace the `ownedSurfaces` and `productMode` branches in `settings-bridge.ts`, `resource-catalog.ts`, `settings-port.ts`, `runtime-selection.ts`, `engine/adapter.ts`, `startup-route.ts`, `engine/workflows.ts`, `engine/host.ts`, `project-trust-prompt.ts`, `settings-bindings.ts`, and `engine/ports.ts` with reads of the record's fields; verify with existing comparison-profile tests and one test that a comparison record withholds every owned surface.

## 4. The shell depends on neutral presentation ports

- [ ] 4.1 Define `ShellPresentationPorts` in `src/contracts/owned-ui` covering theme source, editor factory, dialog factory, selector factory, program status reporter, input classification, hyperlink, width helpers, and workflow command names, using neutral types in place of `PiShell*` and `PiTui*` types; verify the contract imports nothing outside contracts.
- [ ] 4.2 Implement the ports in `src/integrations/pi/session-presenters` from the existing component and TUI adapters; dissolve `shell-shared-facade.ts` by moving each export to its owning module or behind the ports; verify the implementation with the existing component tests redirected to the new owners.
- [ ] 4.3 Inject the ports through `OwnedUiSessionShellOptions.presentation` from composition and switch every file under `src/app/session-shell` that imports `integrations/pi` to the ports, one commit per file group (root, presenter, host, concerns, helpers); verify the session-shell tests pass after each group.
- [ ] 4.4 Remove the shell's Pi-adapter exemption from `project-structure-policy.mjs` so `src/app` may import contracts, UI foundations, and feature owners only, and add a fixture case that an `src/app` import of `src/integrations/pi` fails; update `docs/architecture/boundaries.md` and `project-structure.md` to say the shell reaches Pi only through composition-injected ports.

## 5. The session shell is split by concern

- [ ] 5.1 Move clipboard transport, copy executor, image reader, and paste preparation construction from the presenter constructor to `src/composition/clipboard.ts`, delivered as one `ClipboardServices` port; verify the clipboard and response-copy tests against the composed services.
- [ ] 5.2 Reduce `OwnedUiSessionPresenter` to coordination: each remaining inline construction becomes a `SessionConcern` with typed ports, listed once in `#createConcerns`; verify replacement and disposal order with the existing concern tests and lower its ratchet entry.
- [ ] 5.3 Remove the forwarding methods from `OwnedUiSessionShellRoot` so callers hold the `TranscriptDocument`, `DockChrome`, `WorkflowOutput`, `ExtensionSurface`, and `InputSurfaceSwitch` ports directly; the root keeps layout selection, part assembly, and render; lower or remove its ratchet entry.
- [ ] 5.4 Split `SettingsApp` into `SettingsListState`, `SettingsKeyDispatch`, `SettingsUndo`, and `SettingsRenderer` composed by a thin `SettingsApp`; run the existing 68-case settings-app test unchanged against the composition before redistributing cases; lower or remove its ratchet entry.
- [ ] 5.5 Remove one-to-one forwarders from `PiTuiRuntimeAdapter` in favour of the terminal port, and move announcement and catalog concerns out of `PiEngineAdapter` into the ports built in `engine/ports.ts`; lower both ratchet entries and verify with the adapter and conformance tests.

## 6. Dead and test-only exports go

- [ ] 6.1 Add a rule to `project-structure-policy.mjs` that an exported symbol under `src/` must have an importer under `src/`, `bin/`, or `scripts/`, excluding owner public entries, declared entry modules, and `upstream/`; add a fixture case for a dead export and a test-only export.
- [ ] 6.2 Delete the 146 unused exports and make the 71 test-only exports private; rewrite the affected tests against the owner's public entry or observable behaviour, deleting a test when a stronger test already covers the same contract; verify typecheck and the architecture check.
- [ ] 6.3 Merge the 15 `session-shell*.test.ts` files into one file per concern matching section 5, moving cases verbatim with the shared fixture kept as one module; name the parts that inherit the resource-sensitive partition in `config/validation-suites.json`; verify the merged suites report the same passing case count as the originals.

## 7. Documentation and baselines

- [ ] 7.1 Update `docs/architecture/boundaries.md`, `docs/architecture/project-structure.md`, and the `owned-ux-architecture` and `project-structure-governance` specs to the delivered structure; shrink `config/baselines/size-ratchet.json` with `update-size-ratchet.mjs`; record the before/after figures from the design in the PR acceptance list.
