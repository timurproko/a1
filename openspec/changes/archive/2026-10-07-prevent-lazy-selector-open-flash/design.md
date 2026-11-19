## Context

See `proposal.md` for motivation. The editor clears submitted text synchronously. Most selector routes construct and install their replacement component in that same input turn, but Thinking Level first dynamically imports its dialog façade and Session Tree dynamically imports its large source-ported component. On a cold filesystem or module cache, the input renderer can therefore present the cleared ordinary prompt while either import is pending.

The selector modules were intentionally kept out of the eager startup graph. Fixing the flash by statically importing them would restore atomic opening at the cost of first-frame startup work and would contradict the existing startup boundary for optional workflows.

## Goals / Non-Goals

**Goals:**

- Open Thinking Level and Session Tree with the requested selector as the first presented post-submit surface.
- Preserve the reduced eager startup graph by doing optional work only after the first input-ready frame.
- Cover slash-command and keyboard Session Tree entry paths and retain graceful loader-failure recovery.

**Non-Goals:**

- Changing selector content, styling, focus, filtering, navigation, selection, cancellation, or nested tree dialogs.
- Warming every optional workflow or changing the `a1 pi` comparison profile.
- Hiding a genuinely long operation behind an indefinite render hold.

## Decisions

### 1. Prepare only the two affected modules after the first frame

Add one idempotent lazy-module preparation boundary for the Thinking Level façade and Session Tree component. Start it from the shell's existing post-first-frame immediate callback, alongside other optional warm work. The boundary caches fulfilled modules for synchronous route use and shares any in-flight load rather than evaluating a module twice.

Static imports were rejected because optional selector code must not enlarge the eager startup graph. Preparing every dialog was rejected because the report and source inspection identify only the two routes that await cold component imports before installing their replacement surface.

### 2. Make selector installation atomic once post-frame preparation completes

The ordinary path after startup will resolve the cached constructor synchronously and install the replacement surface before requesting the post-submit presentation. Thinking Level will continue hiding its duplicate footer level only for the selector lifetime. Session Tree will use the same prepared constructor for `/tree` and double-Escape navigation.

If input races the bounded post-frame preparation, the route will share the in-flight promise and coordinate presentation so the cleared ordinary prompt is not exposed as an intermediate frame. The coordination ends on fulfillment or rejection and flushes the latest pending presentation once, preventing a permanent render hold.

Relying only on a likely-fast cached `await` was rejected because an `await` still creates an asynchronous boundary and does not prove presentation ordering. Rendering a temporary loading panel was rejected because it would replace one flash with a second visible modal state.

### 3. Fail visibly and restore the ordinary prompt on loader errors

A preparation rejection must not become an unhandled background rejection. A route that later needs the failed module will report the existing command failure path, restore ordinary input ownership, and request a render. Post-frame preparation remains an optimization and must not make startup fail.

Silently swallowing a permanent failure was rejected because it would make the command appear to do nothing. Holding the last frame after failure was rejected because it could leave stale command text or input ownership on screen.

### 4. Prove frame ordering as well as final snapshots

Focused shell tests will capture presentation requests/surfaces around command submission, not merely render the final selector. They will assert that Thinking Level and Session Tree are the first visible post-submit replacement surfaces after normal post-frame preparation, cover both `/tree` and double Escape, and exercise a controlled pending/rejected loader. Existing selector tests continue to own content and interaction details. The architecture check will prove that the two modules remain outside the eager startup graph.

## Risks / Trade-offs

- **[Risk] Post-first-frame preparation adds background filesystem and evaluation work.** → Limit it to the two reported modules, schedule it after the first frame, and retain the exact startup graph gate.
- **[Risk] A pending loader could suppress unrelated presentation too broadly.** → Scope coordination to the initiating selector-open transition, release it in `finally`, and flush only the latest required frame.
- **[Risk] Background failure could poison later invocation.** → Record the settled failure, avoid unhandled rejection, and route invocation through explicit prompt restoration and command error reporting.
- **[Risk] Tree entry paths could use different module state.** → Centralize the loader and assert slash-command and double-Escape routes use the same prepared constructor.

## Migration Plan

1. Add the idempotent post-first-frame selector-module preparation boundary and scoped presentation coordination.
2. Route Thinking Level and Session Tree creation through the prepared modules without changing their public component ports.
3. Add focused ordering, recovery, interaction, and architecture evidence.
4. Roll back by restoring the current route-local dynamic imports; no stored data or settings migration is required.
