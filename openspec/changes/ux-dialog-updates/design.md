## Context

The supplied screenshots contrast Session Info occupying the whole terminal with Models replacing only the Agent input area. Skills uses the same replacement-input approach. Further supplied screenshots show sign-in method/provider and Project Trust selectors using sentence-case or colon-terminated headings and foreground-only selected rows. All requested changes are presentation-only and belong to one implementation-bound UX PR.

Today `createOwnedRouteHost` obtains the session document through the existing structured workflow snapshot. `SessionDialogCoordinator.openRoute` hands every claimed route to the terminal's full-screen route adapter. Models and Skills instead use `setInputSurface`, leaving transcript and footer rendering to the session viewport.

## Goals / Non-Goals

Goals:
- Put Session Info in the existing in-place input dock, matching Models and Skills rather than introducing a new floating modal.
- Preserve complete session report data, fresh snapshots, styling, wrapped paths, and scrollable sections.
- Preserve close, resize, pointer ownership, input focus, and disposal while retaining conversation context.
- Standardize sign-in and project-trust titles and selected rows to match Models and Skills.
- Keep all work in this draft PR; refine its plan if the maintainer supplies further UX requests.

Non-goals:
- Changing the session statistics engine, values, persistence, cache-warming behavior, authentication workflows, credential handling, or trust decisions.
- Redesigning Models, Skills, Settings, Hotkeys, or Changelog beyond the requested choice-navigation consistency.
- Altering the comparison profile or adding a general-purpose modal framework.

## Decisions

### Use the existing replacement-input lifecycle

Route only bare-A1 Session Info into the dock lifecycle used by existing selectors. Keep the existing route claim and document provider so each invocation still obtains a fresh structured snapshot. Keep full-screen hosting for other owned reference routes.

Prefer a narrow adapter between the existing route surface and replacement-input component contracts. Reuse the shared reference app/report renderer rather than duplicating its sections, scrollbar, wrapping, or shortcut footer. Any required cross-owner API must go through the declared public entries.

A full-screen overlay with smaller content is rejected: it would still capture the whole viewport and hide the conversation. A centered floating modal is also rejected because it does not match the Models/Skills reference.

### Bound rendering and pointer ownership to the dock

Measure available dock space through the same viewport and input-surface conventions as existing in-place selectors. Keep report content scrollable rather than increasing its frame to the full terminal height. Translate local pointer coordinates through the established input-surface routing, so wheel and scrollbar gestures inside the report do not reach the transcript, while pointer interaction outside remains ordinary transcript interaction.

### Preserve report and lifecycle behavior

Continue using the existing Session Info document provider and report renderer. Escape and the existing single-interrupt close policy dismiss the dock without stopping the agent. Restore the default prompt surface on close, replacement, failure, and disposal. Retained drafts and attachments must not be cleared by the new host; normal submitted-command clearing remains unchanged. Deferred loads must not resurrect a closed dialog or retain listeners.

### Use standard headings and selection roles in sign-in and trust

Use accent-bold Title Case headings without a trailing colon: `Select Authentication Method`, `Select Provider to Configure`, and `Project Trust` for the pictured in-session surfaces. Apply the same casing rule to startup trust (`Trust Project Folder?`) without changing its wording or decisions. Preserve provider names, configured-status metadata, option wording, search, counters, navigation, nested back/cancel, and auth outcomes.

Selected choices use the shared semantic `selectedBg` surface, normal text for primary labels, an accent arrow, muted metadata, and no selection-induced bold. Use the same item-bounded selected span as Skills rather than a new color or full-width fill. Preserve independent status/checkmark roles. The startup trust selector must reproduce equivalent fixed default roles without loading project settings, themes, extensions, packages, or other post-trust components.

In-session trust status values start at the same left-aligned value column: `Saved decision:  trusted` and `Current session: trusted`. Pad after the shorter label, not inside the decision value. Do not append a parenthesized saved-decision path; retain the separate project-path context row and the existing underlying trust resolution.

Keep this adaptation in A1-owned presentation boundaries, profile-gated where a selector is shared. The provider adapter retains Pi's public controller and metadata, replacing its public heading/list presentation slots and repainting only the selected primary span through the shared modal boundary. Do not change generic extension-provided content merely to restyle these owned selectors, or remove comparison-profile parity assertions. Update parity tests to explicitly account for declared bare-A1 heading/selection differences while retaining status and action equivalence.

### Focus tests on observable boundaries

Update focused shell tests to distinguish Session Info from full-screen reference routes: no overlay, replaced input surface, unchanged feed, visible footer/transcript, and restored editor. Composition tests retain fresh-provider and report assertions. Cover compact resize, report scrolling and local pointer ownership, close/interrupt, replacement/disposal, and isolation of the comparison profile. Keep the existing full-screen route assertions for Settings, Changelog, and Hotkeys. Add semantic ANSI and visible-text assertions for sign-in and trust titles, selected-background spans, normal labels, muted status, dark/light or truecolor/256-color presentation where supported, and clipping. Keep authentication status/action, trust persistence, startup resource isolation, and comparison-profile assertions.

## Risks / Trade-offs

- A complete report exceeds the normal compact dock: preserve scrolling and usable fixed chrome rather than dropping sections.
- Full-screen pointer coordinates cannot be reused unmodified in the dock: rely on established input-surface geometry and add boundary tests.
- Async loading and route replacement can leak state: exercise early cancellation and late resolution.
- Existing shared-shortcut specifications describe Session Info among full-screen references; the modified Session Info requirement explicitly supersedes that presentation classification without changing shortcut formatting.

## Validation Strategy

Before an implementation push, run `npm run typecheck`, only the directly affected test files, and `openspec validate ux-dialog-updates --strict`. Required post-ready CI remains authoritative. Optional maintainer review should compare `/session` against `/models` and Skills, scroll the full report, resize, and close it; manual review does not gate implementation completion.

## Approved Refinement: Internal Dialog Consistency

The maintainer requested continuous Up/Down navigation for both account and API-key providers, Launcher, Default Model, and the two-step Thinking Level flow, and requested matching styles for all internal dialogs after showing a nested Amazon Bedrock authentication picker.

Apply the owned presentation policy at the internal component-factory boundary rather than relying on each top-level call to pass an opt-in. Nested authentication choices must receive the same policy. Use Title Case without trailing colons while preserving provider names/acronyms and option text; keep extension-authored content and comparison presentation unchanged.

All internal choice lists wrap from first to last on Up and last to first on Down. Filtered lists wrap only their current matches; empty and one-item lists remain safe. Apply this to provider, method, trust, Launcher, Settings model/level/value/structured lists, and ordinary settings navigation. Paging, section jumps, document scrolling, search editing, selection persistence, confirmation, cancellation, and underlying auth/trust effects retain their existing semantics. Startup trust keeps its established startup-safe presentation and navigation.

Use shared movement helpers where existing ownership permits it. Any necessary provider controller adaptation must use public APIs or a source-attributed owned port, never private field access or synthesized navigation against an inaccessible controller. Keep optional controllers deferred to preserve the existing startup budget.

Add focused boundary, filtered/empty/single-choice, profile-isolation, nested auth, Launcher, and Settings tests. Repair the four DOC005 comment-prefix failures reported by exact-head CI as part of this same refinement.

## Implementation Evidence

- Session Info uses a bounded input-route adapter with component-local pointer routing and shared reference rendering. Escape and Ctrl+C close even before its deferred document resolves.
- Sign-in and trust styling is profile-gated; the pinned provider controller retains search, paging, status suffixes, and actions. Trust status values are aligned and the saved-path suffix is omitted without changing resolution.
- Skills loading is deferred behind a presentation hold to keep the existing startup reachability limits; its same public behavior is covered by the unchanged content/navigation assertions plus early-input/disposal tests. Shared generated palette data now includes startup-safe selection backgrounds and is emitted compactly without changing its existing progress roles.
- Build, typecheck, strict OpenSpec validation, architecture boundaries, pinned-source provenance, and palette synchronization passed. Eleven focused test files passed (198 tests), covering shell routes, report rendering, authentication, trust, and Skills.
- No broad local regression suite was run; required finalized-head CI remains authoritative. Interactive terminal review remains optional and was not performed.

## Open Questions

None for the described Session Info, sign-in, and project-trust updates. Additional UX requests are not inferred and require scope refinement in the same PR.

## Known Gaps

None identified in the previously implemented scope. The approved internal-dialog/navigation refinement remains in progress.
