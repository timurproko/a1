## Implementation evidence

### Local exact-package startup

A locally packed candidate was installed into a fresh temporary prefix on Defender-enabled Windows with Node `v24.16.0`. The first attempt passed all tightened budgets without retry:

| Profile | Topology | Input-ready |
| --- | --- | ---: |
| `a1` | post-update | 951 ms |
| `a1` | no live supervisor | 1,066 ms |
| `a1` | warm | 938 ms |
| `pi` | post-update | 935 ms |
| `pi` | no live supervisor | 1,042 ms |
| `pi` | warm | 925 ms |

The exact scalar evidence is in `evidence/startup-package-local-node24.json`. It binds candidate version, release identity, dependency-layer identity, phases, and generated startup-artifact identity. Automatic retries were zero.

### Startup graph

- The A1 static eager graph contains 142 normalized files and 2,621,782 source bytes, with shortest introducing edges and executable broad-barrel rejection. The reviewed byte baseline includes the subsequently integrated first-paste reliability fix without adding an eager module.
- The generated public-Pi artifact digest for the local candidate is `7a2716c0b70a121d55f9652e5cab0e7d8e4894640050eefc3ab3b85a776ad1bc`.
- Its reviewed baseline is 1,747 contributing files and 11,054,687 evaluated bytes. The generated manifest records normalized grouped inputs and 54 dependency license identities with no undeclared licenses.
- Settings presentation and history-editor implementation are excluded from the declared eager A1 graph and load on demand.

### Compatibility and packaging

- Built Pi engine conformance passed public exports, session lifecycle, commands/events, models/authentication, settings, resources/extensions, workflows, and disposal.
- Built component conformance passed messages, tool execution, selectors, dialogs, editor/autocomplete, footer/status, and extension surfaces.
- The exact packed candidate preserved one Pi TUI identity, completed warmup, materialized and certified the release, started/replaced the supervisor, and rendered both profiles.
- Runtime payload inventory declares the generated startup artifact as an entry and its normalized manifest as an asset.

### Maintainer checkout smoke

On 2026-09-16 the maintainer built the implementation checkout and launched both `./scripts/dev pi` and bare `./scripts/dev`. Immediate prompt submission, `/settings`, `/model`, `/resume`, dialog cancellation, and clean exit all passed with no reported delay, crash, duplicate UI, or missing dialog.

### Pending authoritative evidence

- Exact-package Node 22 and current Node 24 hosted CI results remain pending.
- Development publication and authorized exact-head manual merge remain later delivery tasks; the checkout smoke result is supporting evidence, not merge acceptance.
