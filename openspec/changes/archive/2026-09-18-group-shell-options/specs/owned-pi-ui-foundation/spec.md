## MODIFIED Requirements

### Requirement: Public engine and terminal authority remain behind A1 boundaries
The owned UI SHALL use documented public Pi engine and terminal contracts through A1-owned adapters. It SHALL NOT instantiate the stock interactive root, mutate prototypes, inspect private fields, use deep package imports, depend on distribution hashes, or expose Pi-specific types throughout A1 workspace state. The 1:1 requirement SHALL NOT weaken these architecture boundaries. The engine adapter SHALL be a facade over adapter-owned components, each reachable through explicit ports and testable without an engine: the runtime and session lifecycle (creation, generations, subscription, disposal order), transcript projection, event delivery, session event translation, command dispatch, workflows and their selector contexts, provider authentication, settings, resource discovery, prompt suggestions, and the extension UI binding. The adapter alone SHALL own the view model, editor and status state, and the wiring between those components. The owned session shell SHALL take its composition as options grouped by the collaborator that provides them (engine, presentation, history, suggestions, diagnostics) so that each composition profile states what it supplies and a fixture can supply one group without the others.

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

#### Scenario: Compose a shell from grouped options
- **WHEN** the bare-A1 composition, a comparison profile, or a test fixture constructs the owned session shell
- **THEN** it SHALL pass the engine group and only the presentation, history, suggestions, and diagnostics groups it provides
- **AND** the shell SHALL behave exactly as it did with the same seams supplied flat
