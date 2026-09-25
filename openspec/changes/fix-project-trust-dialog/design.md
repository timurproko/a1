## Context

See `proposal.md` for motivation. `resolvePiProjectTrustPreflight` currently calls `hasTrustRequiringProjectResources(cwd)` before it reads the trust store or global `defaultProjectTrust`. When that probe returns false, the resolver returns `{ trusted: true, source: "no-project-resources" }`. Consequently an undecided directory under `ask` receives no prompt and is represented to the runtime as trusted. The existing store itself is path-aware and uses the nearest canonical saved ancestor, so the apparent global behavior is caused by the preflight bypass rather than by one global trust bit.

The prompt runs before A1 may construct project-trusted settings or load project-derived presentation. It therefore cannot reuse the post-trust Models or Thinking component graph directly. Its current fixed ANSI renderer enters a bounded alternate surface, clears it, and renders a nine-line page at the top-left before restoring the parent terminal.

## Goals / Non-Goals

**Goals:**
- Make an undecided working directory under `ask` require an explicit decision on every first launch, whether or not project resources are currently discoverable.
- Preserve exact and ancestor path decisions, configured `always`/`never` defaults, and fail-closed noninteractive behavior.
- Render trust as a vertically compact bottom input dialog with the full-width blue rules used by bare-A1 Models and Thinking selectors and product-neutral explanatory wording.
- Keep the renderer dependency-bounded and prove no project source can influence it before trust resolves.
- Preserve key handling, raw-mode ownership, cancellation, clearing, and terminal restoration.

**Non-Goals:**
- Changing `ProjectTrustStore` persistence, canonicalization, nearest-ancestor semantics, or its JSON schema.
- Asking separately for descendants covered by a saved ancestor decision.
- Adding parent-folder or session-only choices to the startup prompt.
- Loading the ordinary shell, themes, extensions, prompts, packages, or skills before trust is decided.
- Changing the restart-only in-session `/trust` workflow or the `a1 pi` comparison profile.

## Decisions

### 1. Resolve trust policy independently of current resource discovery

Read the nearest saved path decision first and then the global `defaultProjectTrust`. Under `ask`, invoke the interactive prompt for every uncovered working directory. `always` and `never` continue to resolve without interaction, and absent interaction continues to fail closed. Current project-resource discovery no longer grants an undecided directory implicit trust.

This makes trust stable if project resources are added later and makes the visible workflow match its folder-scoped wording. Retaining the resource-free fast path with a different result label was rejected because it would preserve the reported behavior: unrelated directories would still be silently trusted under `ask`.

### 2. Retain canonical nearest-ancestor scope

Continue using `ProjectTrustStore` as the authority for canonical path normalization, exact decisions, and nearest saved ancestor inheritance. Tests will distinguish an unrelated sibling, which must remain undecided, from a child of an explicitly trusted parent, which remains covered. Prompt acceptance and denial continue to persist only the selected working directory.

Replacing ancestor inheritance with exact-only lookup was rejected because parent trust is an established explicit workflow and existing saved records rely on it.

### 3. Render an isolated bottom-anchored startup dialog

Keep the pre-resource renderer self-contained, but compose its visible rows like the ordinary selector family: a full-terminal-width blue rule, inset bold accent title, muted path and explanation, selected option rows, aligned semantic shortcut hints, and a matching closing rule. Position that vertically compact block against the bottom of the available terminal rows instead of at the top-left of an empty surface.

The renderer will use only the fixed product-neutral sentence `This allows to load project settings and resources, install missing project packages, and execute project extensions.`, reviewed fixed ANSI roles, terminal dimensions, and bounded string/geometry helpers in the startup-safe module. It will not import the post-trust theme or component graph. Building the full session shell before trust was rejected because the engine adapter and project-aware services intentionally require a completed trust preflight.

### 4. Bound geometry and preserve terminal ownership

Add terminal-row awareness alongside the existing column bound. On supported terminals the top and bottom rules span every available column in the fixed dark-theme border blue, while the body remains inset and vertically compact. Narrow or short terminals clip/wrap within explicit bounds while retaining the title, options, and actionable keys. Rendering clears and redraws one owned startup frame, and completion, cancellation, stream end, or error restores raw mode, cursor visibility, and the parent screen exactly once.

The dialog remains keyboard-first: arrows and Tab move selection, Enter confirms, Escape/Ctrl+C cancels, and the compatibility `y`/`n` aliases remain available without being advertised as the primary interaction.

### 5. Verify policy and presentation separately

Engine tests will cover saved exact, saved ancestor, unrelated sibling, `ask` with and without currently discoverable resources, `always`, `never`, noninteractive failure, acceptance, denial, and later launches. Renderer tests will normalize ANSI output and assert bottom placement, full-width blue rules, vertically compact geometry, title/hint alignment, selected-row changes, narrow/short fallback, raw-mode transitions, and restoration ordering.

Startup-graph and architecture checks remain the guard that the trust prompt cannot acquire project-derived imports.

## Risks / Trade-offs

- **[Users see more first-launch prompts]** → Prompt only uncovered paths under `ask`; saved ancestor decisions and explicit `always`/`never` defaults remain available.
- **[A bottom dialog still runs before the ordinary shell exists]** → Match the established dialog geometry with a fixed startup-safe renderer rather than weakening the resource-loading boundary.
- **[Very short terminals cannot show every explanatory row]** → Prioritize title, path, choices, and controls under a deterministic compact fallback while keeping ANSI clipping safe.
- **[Ancestor trust can still cover multiple folders]** → Retain it only when that ancestor was explicitly saved; add sibling/descendant tests so an exact project decision cannot leak sideways.
- **[Clearing a bottom frame could leave cursor or alternate-screen artifacts]** → Keep restoration idempotent and assert every completion/error path restores in the existing order.

## Migration Plan

No data migration is required. Existing exact and ancestor trust records keep their meaning. After deployment, only previously uncovered directories under `ask` gain a first-launch prompt; configured default decisions remain unchanged. Rollback restores the resource-free implicit-trust shortcut and the former top-left startup page without rewriting saved decisions.
