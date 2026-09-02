## 1. Retain the Regression Evidence

- [x] 1.1 Record last passing run `33198959119` at `3db775c` / package `0.1.8-dev.182`, PR #186 commit `8c0f4859`, and the first affected run `33488516900` / package `.192`; verify the commit range identifies the first semantic-ANSI harness change rather than attributing the failure to a later validation refactor.
- [x] 1.2 Record repeated macOS/Linux failures for packages `.203`, `.205`, `.209`, and `.210`, including current run `33619304128`; verify build, pack, Windows Node 22, and Windows Node 24 passed for `.210` while exactly six parity assertions failed on both non-Windows lanes.
- [x] 1.3 Preserve the forced-capability reproduction showing 39 static-row mismatches under ambient `trueColor: false`, first actual `38;5;241` versus expected `38;2;102;102;102`, and unchanged focused success under `trueColor: true`.
- [x] 1.4 Record the three Windows `.209` cohort-test timeouts separately and verify packages `.203`, `.205`, and `.210` passed Windows; do not change timeout or serialization policy without recurring independent evidence.

## 2. Add a Bounded Declared-Capability Scope

- [x] 2.1 Add a test-support helper importing public `getCapabilities()` and `setCapabilities()` only from canonical `#pi-tui`; verify production sources, private package paths, installed packages, and workflow environment remain unchanged.
- [x] 2.2 Map declared `truecolor` and `256color` workload modes to copied complete Pi-TUI capability objects and matching A1 theme modes; verify pinned and owned theme instances report the same requested mode before rendering.
- [x] 2.3 Restore the exact prior capability snapshot in `finally` for synchronous and asynchronous callbacks; verify focused tests cover return, throw, resolution, rejection, nested LIFO scopes, sequential scopes, and every non-color capability field.
- [x] 2.4 Keep scoped evidence non-concurrent within a worker and inert at module import time; verify tests detect an unsupported overlapping use or otherwise prove no parity producer uses concurrent capability scopes.
- [x] 2.5 Run existing source and installed Pi-TUI identity checks with the helper; verify `#pi-tui` resolves to the same public module identity used by pinned Pi and no second capability cache is introduced.

## 3. Declare Mode at Every Applicable Parity Boundary

- [x] 3.1 Scope complete static parity construction from pre-theme initialization through root disposal in declared truecolor; verify all retained rows, widths, coverage entries, SGR parameters, reset boundaries, and geometry match existing fixture payloads exactly.
- [x] 3.2 Scope complete asynchronous event-frame construction through shell and adapter disposal in declared truecolor; verify state transitions, frame payloads, controls, resize dimensions, and restoration after producer failure remain exact.
- [x] 3.3 Parameterize pinned-versus-owned settings row parity over `truecolor` and `256color` at 28, 40, and 72 columns plus the retained-row boundary; verify independent raw-terminal parity remains strict in both modes.
- [x] 3.4 Parameterize pinned-versus-owned theme token and fixed-width component parity over dark/light themes, both color modes, and existing widths; verify foregrounds, backgrounds, styles, rows, and reported mode are byte-equal within each declared mode.
- [x] 3.5 Apply declared-mode scoping to independent raw terminal parity where ambient capability currently selects its grammar; verify both modes preserve semantic SGR and that stripping styling still fails authority checks.
- [x] 3.6 Retain `terminal-colour-fidelity` assertions for exact truecolor RGB and 256-color index grammar; verify no test equates, approximates, or converts one grammar into the other.
- [x] 3.7 Verify deterministic parity builders do not read `TERM`, `COLORTERM`, `FORCE_COLOR`, runner labels, or `process.platform` to choose expected output.

## 4. Make Diagnostic Fixtures Host-Independent

- [x] 4.1 Add explicit `truecolor` mode/capability metadata to static and event-frame diagnostic fixtures and their TypeScript interfaces; verify tests reject missing or contradictory metadata without changing the fixture schema authority unexpectedly.
- [x] 4.2 Update existing fixture-generation paths to consume declared truecolor builders; verify running each generator from ambient `trueColor: false` and `trueColor: true` produces identical structured output and hashes.
- [x] 4.3 Prove existing rendered fixture rows and captured ANSI payloads remain unchanged apart from approved metadata; verify no platform-specific fixture, broad SGR stripping, ANSI canonicalization, or fixture regeneration to ambient 256-color is introduced.
- [x] 4.4 Keep current portability normalization limited to declared OSC 8, path, product, and synchronized-output envelopes; verify semantic ANSI, reset boundaries, cursor/clear order, visible text, row order/count, wrapping, truncation, and dimensions remain preserved.
- [x] 4.5 Add a repository boundary check preventing production imports of the test capability helper and preventing this correction from adding production `setCapabilities()` use; verify architecture validation passes.

## 5. Validate and Deliver the Correction

- [x] 5.1 Run focused capability-helper, static parity, event-frame parity, settings parity, raw terminal parity, theme parity, color-fidelity, fixture-generation, and module-identity tests; verify both declared modes pass under the local host without running full/release suites locally.
- [x] 5.2 Run typecheck, architecture, fixture/provenance governance, and strict OpenSpec validation; verify no production source, release workflow, dependency, installed Pi package, or unrelated primary-worktree `bin/pi-tui.d.ts` change is included.
- [ ] 5.3 Push a fresh implementation branch and open a code pull request citing this revised change with auto-merge disabled; verify required current-head CI passes and report any unrelated failure separately instead of weakening parity.
- [ ] 5.4 Provide the exact candidate commit and focused two-mode parity command for maintainer review; verify expected behavior is deterministic test output with no user-visible runtime change.
- [ ] 5.5 After explicit maintainer acceptance and manual merge, run `npm run develop` for the merged commit and verify one newly numbered exact tarball passes Windows Node 22/24, macOS Node 24, Linux Node 24, and the npm publication job.
- [ ] 5.6 Record the correction PR, current-head CI, package number/integrity, all platform outcomes, publication result, maintainer acceptance, and merge identity in `acceptance.md`, then synchronize/archive this skip-spec change in an OpenSpec-only follow-up.
