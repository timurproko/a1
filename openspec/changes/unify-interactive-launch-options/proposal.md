## Why

A1 should be Pi-compatible by default while remaining the full A1 product. The earlier interactive-options-only proposal is superseded: accepting a small launch subset does not deliver the documented CLI, machine protocols, session, resource, extension or programmatic contracts of pinned Pi 1.5.2.

## What Changes

- Make ordinary `a1` expose the versioned public Pi contracts without a compatibility switch, alternate profile or reduced A1 feature set. Keep the optional real `pi` executable only as a thin naming/grammar entry, never a global installation takeover.
- Share public option normalization and applicable launch/session/model/settings/tool/resource services across interactive, print, JSON and RPC transports. Interactive use retains A1's owned UI; machine transports never emit a TUI into protocol stdout. Do not run upstream `main` as an independent agent to obtain compatibility.
- Cover all documented CLI inputs and flags, session persistence/selection/branching/export, models/authentication, tools and built-in extensions, packages/configuration/auth/MCP commands, extension lifecycle/UI, SDK sessions, environment and process shutdown.
- Preserve A1 control-command meanings and the agreed ordinary `--` prompt boundary. Inventory additional collisions, upstream defaults and safety differences explicitly rather than guessing or silently ignoring input.
- Reuse PR #927's runtime identity, API readiness/reporting fences and disposal. Product APIs and task isolation follow real host/session capabilities, not executable spelling.
- Establish packaged subprocess and actual SDK conformance against the pinned contract, with isolated state, deterministic model/provider fixtures and versioned upgrade expectations in existing owners. Existing baseline classifications are not sufficient evidence of entrypoint parity.

The complete engineering inventory is [contract-inventory.md](contract-inventory.md). [design.md](design.md) proposes exact conflict resolutions and a finite four-delivery split. That split has NOT been enacted: this remains the same planning-only PR #928, branch and OpenSpec change, with the complete goal recorded here. Implementation and any split require approval of this reconciled plan. No old blanket RPC/print/JSON/session/maintenance/display/trust exclusions remain.

## Capabilities

### New Capabilities

None as a separate product subsystem. Appropriate transports and missing public operations extend existing owners, not a compatibility registry or second agent.

### Modified Capabilities

- `pi-compatible-launch`: default versioned compatibility, shared services, all documented transports, extension/SDK conformance and a durable differences/evidence inventory.
- `launch-profiles`: full public option routing, agreed command/prompt distinction, appropriate transport selection and authenticated launch payload preservation.
- `cli-session-resume`: remaining session selectors and persistence choices through the same writer-guarded services.
- `extension-packages`: explicit trusted project scope and configuration, without weakening profile or pinned-update ownership.
- `cli-self-update`: explicit optional naming-entry update routing while preserving verified A1 channel/installation authority and embedded-runtime pinning.
- `pi-api-boundary`: transport/programmatic service reuse and compatibility inspection expectations within existing public API and upgrade ownership.

## Impact

Expected owners: `src/cli`, `src/features/launch`, neutral `src/foundation/launch-context` and release transport, `src/integrations/pi/engine`, existing contracts/composition, owned UI/session presenters/components, shipped and development entries, focused tests and user/upgrade documentation. Public programmatic access needs a deliberately exported facade over existing A1 services; A1 currently publishes no SDK entry. Pi knowledge stays inside integration owners; features do not import vendor types. No dependency upgrade or governance-system rewrite is planned.

Baseline remains `2d5c3646784941978b9847b606705e3602c3f888`, containing merged #927. Package and lockfile pin Pi family 1.5.2. This revision preserves the initial planning commit `fcd71bca`; no implementation had started on refresh. #927's archive and unrelated worktrees remain untouched.

Safety conflicts and public-API/external prerequisites remain visible, not silently counted as full parity. No merge, deployment, live fleet repair, credential copying, global Pi replacement, Firstmate/Herdr mutation, sidecar, daemon or second runtime is authorized.
