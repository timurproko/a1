# Implementation evidence

## Delivered behavior

- Both pinned Pi packages are 1.5.2 at b4afdddf44e059c67ccf5097e5317d913521b470. All 33 generated vendored-copy reviews had no upstream content delta or conflict to resolve. The changed InteractiveMode declaration has no A1 production consumer.
- Startup selection retains A1's pre-resource line-mode adapter and its ordinary cross-project fork confirmation. Missing-folder recovery adds explicit Continue, Fork, and Cancel choices, including global-ID lookup and legacy boolean fork callbacks.
- Resume and import use the pinned recovery title and choice labels through the owned extension selector. Extension command-context switching uses the same choice policy and preserves the withSession callback.
- Continue keeps the original ID and stored header cwd; Fork copies history into a distinct ID in the current cwd. Startup and replacement retain writer exclusion, cancellation releases pending startup ownership, and unused forks are removed on switch veto or pre-adoption failure. A callback failure after adoption never deletes the active fork.
- Pi's updated import implementation removes the failed intermediate copy before recovery. Real-runtime tests cover copy-free cancellation, a single continued import, forked import, unchanged original bytes, and later prompt-free fork resume.

## Failed-gate dispositions

The proposal's report is retained unchanged in design.md. Its parity-suites message is truncated after the first deprecated-dependency failure, so the historical ten-test count is not treated as a complete diagnosis. Each failure reproduced during the scoped investigation was handled independently:

| Finding | Disposition |
| --- | --- |
| Standalone parity imports source settings metadata before it exists | Both generators write ignored source metadata before loading fixtures. The first standalone refresh succeeded before any Vitest setup had run. A focused ordering regression protects both entry points. |
| Deprecated dependency exception names Pi 1.5.1 | Re-evaluated node-domexception 1.0.0 through fetch-blob, node-fetch, gaxios, Google auth, and Pi's pinned SDK dependencies. Updated only the exact owning Pi version; package version, deprecation reason, and dependency scope are unchanged. Registry-aware policy and its negative fixtures pass. |
| Two missing-folder modal anchors are orphaned | Re-anchored the node and close transition to the new pinned choice controller and recorded Continue, Fork, and Cancel transitions. Inventory regeneration reports no orphaned or unmapped entries. |
| New feature row is pending and the owned changelog resource lacks the new release | Refreshed attributed command resources from the installed package and assigned the new feature an owned behavior and real-runtime test. |
| Parity and shell provenance still identify the prior pin | Refreshed live identities, lockfile integrities, diagnostic fixtures, and fixture digests. Preserved historical invalidation and regression-only classification. |
| Public API consumer records drift after adapter edits | Regenerated the export baseline from the final consuming modules; the public export surface itself needs no additional adoption. |
| Independent command fixture expects a removed login helper and lacks the current changelog helper | Bound the actual pinned methods and retained fail-closed missing-method checks and all outcome comparisons. Stateful owned selectors now run with their terminal runtime started. |
| Changelog comparison assumes getNewEntries always returns an array | Adopted pinned leading-version parsing and the empty result for unreadable saved versions; added prefixed and prerelease cases to the independent comparison. |

Live previous-pin references were reviewed rather than globally replaced. Remaining 1.5.1 feature rows and changelog entries are historical; npm's unrelated 11.5.1 minimum and SVG asset payloads are unchanged.

## Validation

- Product build, complete source/bin typecheck, architecture and writer-guard checks, code-documentation governance, strict OpenSpec validation, and whitespace checks passed locally.
- Standalone component and event-frame diagnostic refresh succeeded; the diagnostic records remain explicitly non-authoritative for independent visual acceptance.
- Public SDK conformance reported packageVersion 1.5.2 with all eight capabilities passing. The inherited Pi host package-directory override was unset for this inspection; Vitest already clears it through repository setup.
- Focused source tests cover startup selection, real-runtime recovery and writer ownership, extension switching, workflow routing, owned-shell selection and restoration, pre-resource choice input, metadata preparation, and command-resource/changelog compatibility.
- Independent command-outcome comparisons passed in both truecolor and 256-color. Focused static/event-frame/startup/raw-terminal/wheel/theme parity and inventory/public-API/source-ledger/deprecation/provenance tests passed. No directory-wide, preflight, fast, full, or release suite was run locally.
- Exact finalized-head CI is automation-owned and is not claimed by this local record. No physical-terminal manual acceptance or maintainer integration is claimed.

## Gap disposition

No new unresolved behavior gap remains in the approved upgrade scope. Existing historical regression fixtures remain regression-only, not a new claim of complete independent visual parity. The install reported seven dependency-audit advisories; arbitrary transitive upgrades are outside this Pi-pin change, and this delivery makes no vulnerability-free claim. These observations do not replace required current-head CI or the maintainer's separate integration decision.
