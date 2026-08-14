## Context

See `proposal.md` for scope. AddOne's current terminal paths are explicit transparent direct attachment and a separately gated Rust terminal-host proof. Neither is an owned application UI foundation.

Two local references shape the design:

- `C:\Users\tprokopiev\Desktop\v2` demonstrated that an AddOne UI can become rich by patching Pi's stock interactive root, but that approach binds every upgrade to Pi's private classes, renderer state, distribution hashes, and prototype behavior.
- `D:\Git\oh-my-pi` is a full Pi fork. It demonstrates a much stronger architecture for ownership—separate engine, controllers, components, status composition, append-only native-scrollback rendering, sanitized width-safe text, SDK-backed custom UI, and thorough renderer stress testing—but also shows the maintenance and scope burden of forking the entire engine and replacing its runtime ecosystem.

Pi itself now exposes enough documented public API to avoid both extremes: `createAgentSessionRuntime()`, typed session events, service construction, and root-package UI components can support an AddOne-owned root without touching `InteractiveMode` internals.

## Goals / Non-Goals

**Goals:**

- Own the fullscreen terminal root, component tree, view state, reducers, input/focus routing, transcript assembly, status, overlays, and customization slots.
- Use Pi's documented public SDK as the agent engine and keep Pi types confined to adapters.
- Reuse documented root-package Pi components where they are independently usable; port selected MIT-licensed Pi or oh-my-pi components only when AddOne needs ownership and records provenance.
- Deliver one excellent fullscreen Pi session before tabs or multi-agent presentation.
- Preserve exact upstream Pi through `a1 pi` as the comparison and recovery path.
- Make the design composable enough for structured multi-agent tabs after base acceptance.
- Establish upgrade conformance for engine events, services, commands, and public component constructors.

**Non-Goals:**

- Building structured tabs, arbitrary terminal panes, split layouts, or the terminal multiplexer in this change.
- Packaging, launching, or connecting the terminal-host proof in normal AddOne use.
- Patching Pi's `InteractiveMode`, TUI prototypes, private renderer state, installed distribution files, or deep import paths.
- Embedding stock Pi `InteractiveMode` to obtain automatic exact upstream updates.
- Forking the full Pi engine, switching AddOne to Bun, adopting oh-my-pi's provider/tool surface, or recreating its batteries-included feature set.
- Making every Pi extension's visual API work unchanged in the owned UI.

## Decisions

### 1. AddOne owns the root; Pi is the public SDK engine

The architecture is:

```text
AddOne terminal application
  -> AddOne UI runtime
      -> view state and reducers
      -> transcript/editor/tools/status/overlays
      -> input, focus, command, and customization slots
  -> PiEngineAdapter
      -> createAgentSessionRuntime() and public SDK services
```

Pi remains responsible for agent execution, session runtime, tools, model/auth/runtime resources, and typed session events. AddOne owns how those events become visible state and how user actions become commands.

Alternatives considered:

- Pi extensions under stock Pi: lower initial cost, but Pi still owns root composition, transcript, lifecycle, focus, and future tabs.
- `v2` private patching: powerful but repeatedly refactored on Pi upgrades.
- Full fork like oh-my-pi: maximum control, but far more maintenance than AddOne needs now.

### 2. The vanilla-style preset is AddOne-owned, not stock Pi embedded in AddOne

AddOne should reproduce the baseline Pi experience using adapters and public/ported components. It must not claim exact upstream identity. Exact current Pi remains available as `a1 pi`.

This distinction prevents AddOne from inheriting the requirement that every Pi UI refactor automatically work inside AddOne. It also creates a stable baseline for later customization.

### 3. Pi component reuse is allowed, but only through a narrow component bridge

The public Pi package exports useful UI pieces including message, tool, editor, footer, and selector components. AddOne may wrap those exports behind an `AddOneComponent` boundary when their constructor and render contracts are sufficient.

When a component is too coupled to Pi's stock root, AddOne should port it instead:

- record upstream package/source revision, license, attribution, and local modification notes;
- place it in an AddOne-owned module;
- add local conformance coverage;
- synchronize upstream deliberately only when there is product value.

Pi SDK and component types must not leak beyond the adapters. Workspace reducers consume AddOne-owned view models, commands, and diagnostics.

### 4. Learn from oh-my-pi's architecture without adopting its fork model

The oh-my-pi repository confirms that a strong owned terminal UI should separate:

- engine events from presentation;
- interactive-mode orchestration from controllers;
- controllers from renderable components;
- transcript blocks from persistent status and editor chrome;
- component rendering from terminal emission;
- width, wrapping, sanitization, and content measurement from individual renderers;
- core behavior from extension/resource loading.

It also demonstrates that a terminal transcript must be treated as a commit ledger, not just an array of strings. AddOne will adopt these patterns at the AddOne UI boundary: component-owned immutable render results, explicit live/final transcript regions, append-only history semantics, and sanitized width-safe rendering.

AddOne will not adopt oh-my-pi's full fork structure, Bun-only runtime, large provider/tool catalog, native N-API engine, custom package export depth, or product scope. The lesson is architectural layering and renderer discipline, not dependency breadth.

### 5. Transcript and streaming are authoritative UI state

Pi session events are reduced into ordered AddOne view models:

- user messages;
- assistant streaming and completed messages;
- thinking and compaction presentation;
- tool calls, updates, and results;
- queued input and pending submissions;
- retry, abort, and error states;
- model/thinking/session/status metadata;
- diagnostics and recovery affordances.

The transcript stores finalized and live blocks separately enough that resize and presentation do not rewrite committed history or lose scrolled content. Render output is cached and width-aware, and terminal writes are coalesced into bounded frames.

### 6. Input, editor, paste, clipboard, and focus are AddOne-owned

AddOne owns the prompt editor, keyboard bindings, text/IME/paste behavior, queued input, selection, clipboard integration, and focus order. SDK commands are issued only after AddOne's input controller resolves the action.

Pi's editor may be reused if the public `CustomEditor` contract satisfies the required behavior. Otherwise AddOne builds a narrow editor component over public terminal primitives and owns its behavior explicitly.

### 7. Customization is slot-based, not host mutation

Stable slots include:

- transcript block renderers;
- tool card renderers;
- editor;
- status/header/footer;
- command and selector surfaces;
- overlays and dialogs;
- themes;
- future structured tab layout composition.

A customization receives a typed AddOne view model and returns AddOne-owned render results or actions. It cannot mutate the Pi package, terminal renderer, or session engine.

Visual Pi extension compatibility is not promised in the first phase. Non-visual Pi tools, skills, commands, and resources are loaded where the public SDK supports them. A later explicit AddOne bridge can host selected visual extension concepts.

### 8. The first acceptance gate is a single fullscreen session

The acceptance gate proves the vanilla-style base workflow before customization breadth:

- prompt, stream, tool execution, and completion;
- abort, retry, compaction, and error surfaces;
- model and thinking controls;
- session create/resume;
- queued input and paste;
- clipboard and selection;
- resize and terminal restoration;
- diagnostics and clean shutdown;
- upgrade adapter conformance;
- comparison against `a1 pi`.

No multi-agent tabs are exposed until this gate passes.

### 9. Runtime stack remains AddOne's Node/TypeScript product

AddOne remains on Node and TypeScript. The UI renderer may use public `pi-tui` primitives or an AddOne-owned narrow renderer built over terminal primitives if the public engine does not expose enough control. In either case AddOne owns its component contracts and upgrade tests.

The design should not introduce Bun, oh-my-pi's package scope, or native UI dependencies as a shortcut.

### 10. Upgrade conformance is a release prerequisite

Each Pi upgrade candidate runs fixture suites for:

- public SDK session construction and service creation;
- typed event shape and sequencing;
- prompt, abort, compaction, retry, model, thinking, resume, and shutdown commands;
- public component constructor/render contracts;
- AddOne adapter mapping;
- vanilla-style render fixtures;
- terminal restore and cleanup.

If Pi changes public behavior, the change is reviewed and contained in engine/component adapters. AddOne does not rely on hash checks to guess safety; it runs conformance against declared public APIs.

## Risks / Trade-offs

- **[The public SDK may not expose every orchestration behavior needed for vanilla parity]** → Identify gaps through the first implementation slice and cover them with owned orchestration over public events; escalate only through documented APIs or provenance-recorded ports.
- **[Reused components can still be coupled to Pi's root]** → Wrap each candidate independently, test its constructor/render behavior, and replace only that component if coupling appears.
- **[Porting selected code can become an accidental fork]** → Keep ports narrow, attributed, version-stamped, and covered; do not copy engine internals or whole directories.
- **[oh-my-pi's renderer architecture is mature but its scope is much larger]** → Extract its architectural invariants and testing strategy, not its dependency graph or product surface.
- **[Terminal transcript rendering has historically hidden corruption modes]** → Implement append-only history invariants, width-safe rendering, stress fixtures, and manual comparison before acceptance.
- **[Customization slots can become an accidental second extension API]** → Version and bound slots, support AddOne-owned contracts only, and defer Pi visual-extension compatibility.
- **[Pi upgrades can break public component assumptions]** → Keep components behind adapters and require conformance fixtures before release.
- **[Exact vanilla identity is not possible without embedding stock Pi]** → Preserve `a1 pi` as the exact path and document the owned preset as vanilla-style rather than identical.

## Migration Plan

1. Create or switch to `milestone/owned-pi-ui-foundation` before editing implementation files; that branch may base on `milestone/multi-agent-workspace` for planning and structured-runtime prerequisites but SHALL NOT implement this change there.
2. Add architecture contracts and boundary checks for the owned UI and Pi adapter before exposing a new launch mode.
2. Implement the Pi engine adapter with an in-memory harness and event/command conformance fixtures.
3. Implement the terminal runtime, state reducers, transcript, editor, status, and diagnostics for one session.
4. Add vanilla-style component reuse or provenance-recorded ports one surface at a time.
5. Run automated conformance, terminal rendering, input, resize, lifecycle, resource, and explicit-mode regression tests.
6. Run user-controlled manual base-UX acceptance against the exact development artifact and compare with `a1 pi`.
7. Merge through `develop` and publish only an explicitly selected development path under npm `next` if the base gate passes.
8. Then resume structured multi-agent tab work in the existing milestone change; composed terminal proof and multiplexer work remain separately gated.
9. Roll back by disabling the owned UI path and restoring the existing transparent launch behavior; versioned UI settings remain readable for retry.
