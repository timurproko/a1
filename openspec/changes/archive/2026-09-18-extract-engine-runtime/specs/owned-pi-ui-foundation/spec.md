## MODIFIED Requirements

### Requirement: Public engine and terminal authority remain behind A1 boundaries
The owned UI SHALL use documented public Pi engine and terminal contracts through A1-owned adapters. It SHALL NOT instantiate the stock interactive root, mutate prototypes, inspect private fields, use deep package imports, depend on distribution hashes, or expose Pi-specific types throughout A1 workspace state. The 1:1 requirement SHALL NOT weaken these architecture boundaries. The engine adapter SHALL be a facade over adapter-owned components, each reachable through explicit ports and testable without an engine: the runtime and session lifecycle (creation, generations, subscription, disposal order), transcript projection, event delivery, session event translation, command dispatch, workflows and their selector contexts, provider authentication, settings, resource discovery, prompt suggestions, and the extension UI binding. The adapter alone SHALL own the view model, editor and status state, and the wiring between those components.

#### Scenario: Pinned private interactive code is installed
- **WHEN** the Pi package contains stock interactive classes or private renderer state
- **THEN** A1 SHALL operate without constructing, patching, or inspecting those internals

#### Scenario: Exact behavior requires a coupled source unit
- **WHEN** covered behavior cannot be reused through a documented public contract
- **THEN** A1 SHALL port the minimum coherent source unit with provenance and an A1-owned boundary rather than deep-importing or patching it

#### Scenario: Drive an engine component without the adapter
- **WHEN** the runtime lifecycle, command dispatch, session event translation, settings port, resource catalog, prompt suggestions, extension UI binding, or provider authentication is driven directly with fake sessions, runtimes, and ports
- **THEN** it SHALL produce the same generations, outcomes, work-state transitions, snapshots, resource summaries, suggestions, bindings, and wording the shell observes through the adapter
- **AND** the adapter SHALL stay under 800 lines with no engine module over 600
