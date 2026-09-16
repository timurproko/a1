## Implementation evidence

### Local exact-package startup

A locally packed candidate was installed into a fresh temporary prefix on Defender-enabled Windows with Node `v24.16.0`. The first attempt passed all tightened budgets without retry:

| Profile | Topology | Input-ready |
| --- | --- | ---: |
| `a1` | post-update | 1,058 ms |
| `a1` | no live supervisor | 1,165 ms |
| `a1` | warm | 942 ms |
| `pi` | post-update | 917 ms |
| `pi` | no live supervisor | 1,018 ms |
| `pi` | warm | 891 ms |

The exact scalar evidence is in `evidence/startup-package-local-node24.json`. It binds candidate version, release identity, dependency-layer identity, phases, and generated startup-artifact identity. Automatic retries were zero.

### Historical baseline and startup graph

The retained failed publication run `35093836130` measured exact package `0.1.8-dev.428` at source `71058e27df33ca3ac08ab527417e87c78ab01fd5` with Defender enabled and no retries. Node 22 first-input-ready results were 2,499/2,681/2,434 ms for A1 and 2,438/2,586/2,390 ms for Pi (post-update/no-supervisor/warm). Node 24 results were 1,784/1,777/1,642 ms for A1 and 1,744/3,443/4,477 ms for Pi. The 4,477 ms failure attributed 2,563 ms to `ui-modules-loaded` and 1,457 ms to `ui-entry`. Exact retained values and package digest are in `evidence/startup-prechange-hosted.json`.

The historical package predates module-census instrumentation and did not emit runtime module/file/evaluated-byte, release-id, or dependency-layer-id fields. They cannot be reconstructed as runtime measurements after publication. This is an explicit evidence gap rather than an inferred value; the implementation independently gates the normalized optimized graph.

- The A1 static eager graph contains 142 normalized files and 2,624,425 source bytes, with shortest introducing edges, executable broad-barrel rejection, and a deterministic `initial-render` or `first-prompt-correctness` classification for every eager module. Reviewed growth after the first candidate comes only from subsequently integrated paste reliability, terminal restoration, and timestamp fixes and adds no eager module.
- The generated public-Pi artifact digest is `7a2716c0b70a121d55f9652e5cab0e7d8e4894640050eefc3ab3b85a776ad1bc`.
- Its reviewed baseline is 1,747 contributing files and 11,054,687 evaluated bytes. The generated manifest records normalized grouped inputs and 54 dependency license identities with no undeclared licenses.
- Settings presentation and history-editor implementation are excluded from the declared eager A1 graph and load on demand.

The classification retained selectors/dialogs because command routes must exist before accepted input, rich transcript/image presenters because a resumed session can require them in its initial frame, clipboard preparation because the first accepted input may be a paste, and status/package presentation because it contributes to deterministic initial state. No other candidate was safe to defer without changing readiness or resumed rendering semantics. The focused shell, settings-route, history, extension, resource, model, resume, terminal-input, image, clipboard, and deferred-failure suites exercise those decisions.

The A1 leaf-import conversion and the Pi artifact were developed in one branch, so no independently packaged intermediate A1-only timing candidate exists. The deterministic reachability gate proves the A1 barrel removal; exact before/after wall-time evidence compares the retained pre-change package with the final exact package without inventing an intermediate measurement.

### Compatibility and packaging

- Built Pi engine conformance passed public exports, session lifecycle, commands/events, models/authentication, settings, resources/extensions, workflows, and disposal.
- Built component conformance passed messages, tool execution, selectors, dialogs, editor/autocomplete, footer/status, and extension surfaces.
- The exact packed candidate preserved one Pi TUI identity, completed warmup, materialized and certified the release, started/replaced the supervisor, and rendered both profiles.
- Runtime payload inventory declares the generated startup artifact, normalized manifest, and startup descriptor.
- Interactive launch and warmup both call the generated descriptor's one literal eager-graph loader. Descriptor identity `f36dc423932ce34e0ca71ebbb3bf86b6623b7f2e75d8efc540ff6c48f926d187` binds the ordered eager entries, generated artifact digest, dependency-layer launch-context source, and compile-cache namespace strategy. Repeated generation is byte-stable, while entry or artifact changes alter identity; immutable release certification rejects descriptor mutation.

### Maintainer checkout smoke

On 2026-09-16 the maintainer built the implementation checkout and launched both `./scripts/dev pi` and bare `./scripts/dev`. Immediate prompt submission, `/settings`, `/model`, `/resume`, dialog cancellation, text paste, and clean exit all passed with no reported delay, crash, duplicate UI, or missing dialog. The maintainer also confirmed the comparison profile is vanilla Pi; on Windows its declared image-paste shortcut is `Alt+V`, while terminal-owned `Ctrl+V` remains text paste.

### Known-gap dispositions and later authority

- The historical package did not emit a runtime module census, release id, or dependency-layer id; retained exact package/version/digest, lane, topology, timing, and failing phase evidence is used without reconstructing unavailable measurements.
- The leaf-import and Pi-artifact changes were developed together, so no independently packaged A1-only intermediate timing candidate exists; deterministic A1 reachability proves barrel removal and final exact-package evidence measures the combined outcome.
- Hosted exact-head Node 22/24 results intentionally run only after version-3 finalization and the PR becomes ready; they remain a required pre-merge gate rather than evidence claimed by this draft.
- Authoritative development preview publication can run only from `develop` after authorized manual merge; its registry and hosted startup results are a post-merge operational outcome, not branch-generated evidence.
- Authorized exact-head manual merge remains the acceptance decision. The checkout smoke result is supporting evidence and does not claim merge acceptance.
