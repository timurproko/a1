## 1. Declare the settings contract

- [x] 1.1 Add `src/foundation/owned-ui-settings/declarations.ts` with the setting declaration type
  (id, value type, allowed values, default, description, live-applicable or restart-required) and the
  declared set for this milestone, containing the one inert preference the design names; verify by a
  unit test asserting every declaration has a default within its own allowed values
- [x] 1.2 Add the version stamp constant and the ordered declared-migration list (empty at version 1)
  in `src/foundation/owned-ui-settings/migrations.ts`; verify by a unit test asserting the list is
  ordered, contiguous, and ends at the current version

## 2. Resolve settings as a pure function

- [x] 2.1 Implement `resolveSettings(declarations, parsedDocument)` in
  `src/foundation/owned-ui-settings/resolution.ts` returning resolved values, rejected entries, and
  preserved unknown keys; verify with unit tests for the absent-file, partial-file, out-of-range, and
  unknown-key scenarios in the `owned-ui-settings` spec
- [x] 2.2 Implement forward migration on read in `resolution.ts`, running declared migrations in
  order for an older stamp and falling back to declared defaults with a reported mismatch for a newer
  stamp; verify with unit tests for the older-supported-version, renamed-setting, missing-migration,
  and newer-version scenarios
- [x] 2.3 Prove resolution never throws for any malformed input by a property test over arbitrary
  JSON values, asserting it always returns a complete resolved set

## 3. Persist settings

- [x] 3.1 Implement the store in `src/foundation/owned-ui-settings/store.ts` reading and writing
  `<configDir>/settings/<profile-id>.json` from `resolveProductPaths()`, writing atomically through a
  temporary sibling and rename, and preserving unknown keys on write; verify with integration tests
  using an `A1_CONFIG_DIR` override
- [x] 3.2 Cover the failure paths: unparseable file resolves defaults and reports once without
  throwing, an unwritable location reports a failed store while the session continues, and a truncated
  temporary file never becomes authoritative; verify each by an integration test that asserts the
  reported outcome, not only the absence of a throw
- [x] 3.3 Add a test asserting two profile ids resolve independent values and that no write touches
  `~/.pi/agent` or `~/.a1/sandbox`; verify by comparing a recorded directory listing and file digests
  before and after a write

## 4. Apply settings to a running session

- [x] 4.1 Resolve settings once during owned UI startup in `src/features/owned-ui/run.ts`; verify by a
  test asserting resolution completes before the application starts and that a settings-free run still
  succeeds
- [x] 4.2 Implement change application so a live-applicable setting takes effect in the running
  session and every reader observes the same value, while a restart-required setting is stored and
  reported as pending; verify with tests for the live-change, restart-required, and abandoned-change
  scenarios

## 5. Offer the section model

- [x] 5.1 Build the section model in `src/foundation/owned-ui-settings/sections.ts`: an A1 section from
  the declarations, plus an Agent section built from `AgentSettingsPort.listSettings()`, each entry
  carrying its backend, current value, choices, description, and whether it is editable; verify by
  unit tests over a synthetic settings port
- [x] 5.2 Handle the degraded engine cases: no advertised `write` reports Agent entries as not
  editable with a stated reason, and a failing, empty, or absent port still yields a complete A1
  section plus an unavailable Agent section; verify by tests for both spec scenarios
- [x] 5.3 Route accepted changes by backend in `session.ts`: an A1 entry writes the A1 document and
  never touches the port, an Agent entry writes through `writeSetting` and flushes where advertised
  and never touches the A1 document; verify by tests asserting each backend is called and the other is
  not
- [x] 5.4 Reach the engine port lazily through `PiEngineAdapter.settingsPort()` so the Agent section is
  populated once the runtime is up; verify by a test asserting the provider is consulted at load
  rather than at construction

## 6. Wire the profile through

- [x] 6.1 Carry the A1 profile id through `runtime-selection.ts`, `composition`, and `bin/a1-ui.js` so
  the store resolves under the active profile; verify by updating the runtime-selection test to assert
  the owned runtime receives its profile id

## 7. Integrate

- [x] 7.1 Run `npm run typecheck` and `npm run check:architecture` and confirm both pass with the new
  module and its declared ownership direction
- [ ] 7.2 Open the pull request into `develop` and confirm the required development validation check
  passes in CI
