## Context

See `proposal.md` for scope. AddOne now has a proven public-SDK engine adapter, owned UI contracts, diagnostics, launch routing, customization registry, and a hand-written terminal runtime spike. Manual acceptance showed that the hand-written renderer/editor is too far from Pi and too fragile to serve as the product path.

Two local references constrain the correction:

- `C:\Users\tprokopiev\Desktop\v2` proved that private Pi patching is rich but upgrade-bound.
- `D:\Git\oh-my-pi` shows the value of mature controller/component separation and renderer stress testing, while also showing the cost of a full fork.

The corrected design uses Pi's public SDK for engine behavior, public `pi-tui` for terminal primitives, public Pi components where independently usable, and provenance-recorded orchestration ports only where AddOne must own composition.

## Goals / Non-Goals

**Goals:**

- Own the AddOne shell composition, reducers, command routing, and customization slots.
- Use public `pi-tui` for terminal input, focus, differential rendering, overlays, resize, and restoration.
- Use public Pi components as the default transcript/editor/tool/dialog surfaces.
- Port only the minimum Pi orchestration needed to own session composition, with exact MIT provenance.
- Reach observable parity with the pinned current Pi version before customization, structured tabs, or publication.
- Keep exact upstream Pi available through `a1 pi`.
- Establish automated component, event-sequence, and terminal-frame parity gates.

**Non-Goals:**

- Continuing the hand-written terminal runtime, prompt editor, transcript renderer, or custom chrome as the production path.
- Patching `InteractiveMode`, TUI prototypes, private renderer state, installed distribution files, or deep imports.
- Embedding stock `InteractiveMode` merely to inherit upstream behavior automatically.
- Forking Pi, switching AddOne to Bun, adopting oh-my-pi's scope, or implementing the terminal multiplexer here.
- Promising automatic byte-for-byte identity with future Pi versions.

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

The shell should use Pi's public components wherever they can be constructed and rendered through supported contracts. This includes the editor, user/assistant messages, tool execution, selectors, dialogs, and status/footer surfaces.

A component may be bypassed only when it cannot operate outside Pi's stock root. That bypass must be a narrow AddOne-owned port with:

- exact Pi package/source revision;
- MIT license and copyright attribution;
- copied-file and local-modification inventory;
- AddOne-owned contract;
- conformance and parity coverage.

### 4. Orchestration is ported at controller boundaries

Pi's stock `InteractiveMode` is not instantiated or patched. Its event, input, command, selector, and session-focus orchestration is ported only as needed into an AddOne-owned `PiSessionShell`.

This differs from `v2`: the port is source and provenance based, uses public SDK events/commands, and never mutates installed Pi objects. It differs from a full fork because only controller composition and AddOne seams are owned.

### 5. Parity means observable parity at the pinned Pi version

The acceptance target is not "same code" or "automatic future identity." It is:

- same rendered component rows for equivalent states and widths;
- same view-state transitions for scripted Pi event sequences;
- same terminal screens for covered emitted-frame scenarios;
- same baseline user workflows for the pinned Pi package.

Documented tolerances may cover terminal capability negotiation or timing, but visual content and state transitions must not diverge.

### 6. A parity harness is mandatory before manual acceptance

The harness has three layers:

1. Component snapshots: equivalent message/tool/editor/dialog state rendered at fixed widths.
2. Event sequences: scripted session events reduced by Pi's expected result and the AddOne shell.
3. Terminal frames: emitted ANSI rendered into a virtual terminal or equivalent captured frame and compared.

Manual acceptance starts only after these gates pass. This prevents screenshot-driven debugging from becoming the primary test method.

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
- **[The spike work may feel wasted]** → Preserve its contracts, adapter, diagnostics, and governance; discard only the presentation internals that failed parity.
- **[Extensions offer cheaper upgrades but weaker ownership]** → Use owned slots for AddOne product surfaces and support only explicitly mapped non-visual Pi resources initially.
- **[Exact future identity is impossible]** → Publish parity as current-version observable parity, not as a promise to match unreleased Pi changes automatically.

## Migration Plan

1. Preserve the current spike commit and evidence; stop using it as the acceptance target.
2. Add the exact public `pi-tui` dependency and `PiTuiRuntimeAdapter` with public-runtime conformance.
3. Build `PiSessionShell` from public Pi components and provenance-recorded orchestration ports.
4. Replace `a1 ui`'s hand-written presentation with the shell while keeping explicit modes unchanged.
5. Build component snapshot, event-sequence, and terminal-frame parity fixtures for the pinned Pi version.
6. Correct every parity divergence and rerun focused plus containing gates.
7. Run the short user-controlled manual smoke acceptance against the exact parity-passing artifact and compare with `a1 pi`.
8. Only then publish the development path, enable customization slots, and resume structured multi-agent tab work.
9. Roll back by disabling `a1 ui`; bare transparent AddOne, `a1 pi`, and `a1 sandbox` remain unchanged.
