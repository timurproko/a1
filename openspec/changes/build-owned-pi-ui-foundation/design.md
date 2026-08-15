## Context

See `proposal.md` for scope. AddOne now has a proven public-SDK engine adapter, owned UI contracts, diagnostics, launch routing, customization registry, and a hand-written terminal runtime spike. Manual acceptance showed that the hand-written renderer/editor is too far from Pi and too fragile to serve as the product path.

Two local references constrain the correction:

- `C:\Users\tprokopiev\Desktop\v2` proved that private Pi patching is rich but upgrade-bound.
- `D:\Git\oh-my-pi` shows the value of mature controller/component separation and renderer stress testing, while also showing the cost of a full fork.

The corrected design uses Pi's public SDK for engine behavior, public `pi-tui` for terminal primitives, public Pi components where independently usable, and provenance-recorded orchestration ports only where AddOne must own composition.

The first implementation of that correction failed user-controlled smoke acceptance. It rendered an editor and footer-like row but lacked vanilla startup composition and command discovery, and ordinary prompt submission produced no visible turn. Its static fixtures rendered only AddOne-created states, while its event/frame fixtures drove a synthetic session; neither used an independent vanilla-Pi oracle. Tasks and evidence based on those fixtures are reopened.

## Goals / Non-Goals

**Goals:**

- Own the AddOne shell composition, reducers, command routing, and customization slots.
- Use public `pi-tui` for terminal input, focus, differential rendering, overlays, resize, and restoration.
- Use public Pi components as the default transcript/editor/tool/dialog surfaces.
- Port the complete pinned baseline of Pi orchestration needed for ordinary interactive use, with exact MIT provenance and a behavior inventory that prevents representative subsets from being called complete.
- Reach observable parity with the pinned current Pi version before customization, structured tabs, or publication, including startup, prompts, command discovery, every pinned built-in command, selectors, settings, sessions, models, streaming, tools, footer/status state, clipboard, resize, errors, and shutdown.
- Keep exact upstream Pi available through `a1 pi`.
- Establish independent upstream-reference component, command-manifest, end-to-end prompt, event-sequence, and terminal-frame parity gates.

**Non-Goals:**

- Continuing the hand-written terminal runtime, prompt editor, transcript renderer, or custom chrome as the production path.
- Patching `InteractiveMode`, TUI prototypes, private renderer state, installed distribution files, or deep imports.
- Embedding stock `InteractiveMode` merely to inherit upstream behavior automatically.
- Forking Pi, switching AddOne to Bun, adopting oh-my-pi's scope, or implementing the terminal multiplexer here.
- Promising automatic byte-for-byte identity with future Pi versions.
- Treating AddOne-generated snapshots, synthetic sessions, or representative command subsets as evidence of vanilla parity.

## Decisions

### 1. AddOne owns the shell; Pi provides public engine and terminal primitives

The production architecture is:

```text
AddOne PiSessionShell
  -> AddOne reducers, command routing, customization slots
  -> PiTuiRuntimeAdapter
      -> public pi-tui TUI / ProcessTerminal / focus / overlays / renderer
  -> PiComponentAdapter
      -> public Pi editor, transcript, tool, selector, footer components
  -> PiEngineAdapter
      -> public createAgentSessionRuntime and services
```

AddOne owns which components exist and how workspace/customization state reaches them. It does not own low-level terminal byte parsing or differential rendering.

### 2. The custom renderer spike is not the product path

The existing `OwnedTerminalRuntime`, prompt editor, transcript renderer, and hand-made chrome remain only as evidence about contracts, integration, and failure modes. `a1 ui` must switch to the Pi-backed shell before acceptance. Keeping the custom runtime as a second supported UI would create two incompatible acceptance surfaces, so it is excluded from production rather than polished.

### 3. Public Pi components are the default visual surfaces

The shell should use Pi's public components wherever they can be constructed and rendered through supported contracts. This includes the editor, user/assistant messages, tool execution, selectors, dialogs, and status/footer surfaces. Components must retain the stateful lifecycle expected by Pi—especially streaming messages, tools, editor history/autocomplete, selectors, and footer data—rather than being reconstructed from shallow text snapshots on every render.

A component may be bypassed only when it cannot operate outside Pi's stock root. That bypass must be a narrow AddOne-owned port with:

- exact Pi package/source revision;
- MIT license and copyright attribution;
- copied-file and local-modification inventory;
- AddOne-owned contract;
- conformance and parity coverage.

### 4. Orchestration is ported at controller boundaries

Pi's stock `InteractiveMode` is not instantiated or patched. Its startup, prompt-loop, event, input, command, autocomplete, selector, settings, session, footer, clipboard, and shutdown orchestration is inventoried at the pinned source revision and ported into an AddOne-owned `PiSessionShell` in coherent slices.

A command switch containing a small hand-selected subset is not a valid port. The pinned Pi built-in command manifest is an explicit conformance input, and every command must be implemented, deliberately mapped to an equivalent public-SDK workflow, or recorded as unavailable only where the capability specification explicitly permits it.

This differs from `v2`: the port is source and provenance based, uses public SDK events/commands, and never mutates installed Pi objects. It differs from a full fork because engine implementation, terminal primitives, and independently reusable components remain upstream dependencies while only controller composition and AddOne seams are owned.

### 5. Parity means observable parity at the pinned Pi version

The acceptance target is not "same code" or "automatic future identity." It is:

- the same startup/header, editor, command-discovery, transcript, status, and footer content for equivalent states and widths;
- the same complete built-in command manifest and equivalent observable command outcomes;
- the same view-state transitions for scripted Pi event sequences and a real end-to-end prompt turn;
- the same terminal screens for covered emitted-frame scenarios;
- the same baseline user workflows for the pinned Pi package.

Documented tolerances may cover terminal capability negotiation or timing, but visual content, command availability, prompt effects, and state transitions must not diverge.

### 6. The parity oracle must be independent of the AddOne shell

The harness has four layers:

1. Upstream component and composition captures: pinned Pi results and AddOne results are generated through separate paths at fixed widths and states.
2. Command-manifest and workflow conformance: the pinned built-in command inventory, autocomplete, keybindings, selectors, and command outcomes are compared exhaustively.
3. Event and real-prompt sequences: both synthetic edge cases and at least one real SDK-backed prompt turn prove submission, streaming, tools, completion, and error visibility.
4. Terminal frames: independently captured upstream and AddOne ANSI output is normalized only for documented terminal negotiation and timing tolerances, then compared.

A fixture produced solely by rendering `PiSessionShell`, or a synthetic runtime tested only against AddOne-authored expected output, is a regression fixture but not parity evidence. Manual acceptance starts only after the independent gates pass.

### 7. Customization sits above the parity-safe shell

AddOne customization slots remain stable but resolve against AddOne-owned view models and shell surfaces. They cannot mutate Pi packages, runtime classes, or stock extension UI assumptions. Slots are disabled until parity acceptance to avoid locking in a broken baseline.

### 8. Upgrade strategy is controlled sync, not automatic inheritance

Pi upgrades run:

1. public SDK conformance;
2. `pi-tui` runtime conformance;
3. public component conformance;
4. parity fixtures;
5. upstream-source diff review for ported orchestration.

Failures stay inside engine/runtime/component adapters or the provenance-recorded shell port. `a1 pi` remains the exact upstream recovery path.

## Risks / Trade-offs

- **[Pi's public component constructors may still assume stock TUI context]** → Validate each component in the adapter and port only the minimum coupled behavior with provenance.
- **[Ported orchestration can drift from Pi]** → Use pinned versions, source-diff review, and parity fixtures on every upgrade.
- **[Parity fixtures can miss terminal-specific behavior]** → Keep automated frame fixtures broad and reserve a short manual smoke pass after the gate, not months of manual discovery.
- **[Circular fixtures can certify AddOne against itself]** → Require separate pinned-upstream and AddOne producers, record both raw artifacts and hashes, and reject synthetic-only output as parity evidence.
- **[The complete interactive controller port is substantially larger than the demonstration shell]** → Inventory the pinned behavior first, implement coherent controller slices, and gate each slice against upstream before claiming completion.
- **[The spike work may feel wasted]** → Preserve its contracts, adapter, diagnostics, and governance; discard only the presentation internals that failed parity.
- **[Extensions offer cheaper upgrades but weaker ownership]** → Use owned slots for AddOne product surfaces and support only explicitly mapped non-visual Pi resources initially.
- **[Exact future identity is impossible]** → Publish parity as current-version observable parity, not as a promise to match unreleased Pi changes automatically.

## Migration Plan

1. Preserve the current spike commit and evidence; stop using it as the acceptance target.
2. Preserve the public `pi-tui` runtime adapter work that passed its narrow conformance tests.
3. Inventory pinned Pi startup composition, editor/autocomplete/keybindings, built-in commands, selectors, settings/session/model workflows, event rendering, footer/status, clipboard, resize, and shutdown behavior; bind every item to an upstream source location and validation case.
4. Replace the demonstration `PiSessionShell` orchestration in coherent slices while continuing to use public Pi components and AddOne-owned adapter contracts.
5. Build separate upstream and AddOne producers for component/composition captures, command manifests and workflows, event results, real prompt turns, and terminal frames.
6. Correct every divergence and rerun focused plus containing gates; do not reuse the invalidated synthetic parity acceptance record.
7. Run the short user-controlled manual smoke acceptance against the exact independently parity-passing artifact and compare with `a1 pi`.
8. Only then publish the development path, enable customization slots, and resume structured multi-agent tab work.
9. Roll back by disabling `a1 ui`; bare transparent AddOne, `a1 pi`, and `a1 sandbox` remain unchanged.
