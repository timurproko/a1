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

Keep this adaptation in A1-owned presentation boundaries, profile-gated where a selector is shared. The original style-only adapter reused Pi's public provider controller. The navigation refinement now uses an attributed owned provider port so circular movement does not access private fields or synthesize hidden navigation. It preserves pinned option metadata, search, paging, partner markers and status formatting. Do not change generic extension-provided content merely to restyle these owned selectors, or remove comparison-profile parity assertions. Update parity tests to explicitly account for declared bare-A1 heading/selection differences while retaining status and action equivalence.

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

## Approved Refinement: Session Info Value Alignment

The maintainer requested left alignment of the Session Info values shown at different columns in the supplied report screenshot. Render report data as semantic label/value rows sharing one value column across identity, message, token, warming, and cost groups. Preserve nested label indentation, all calculations and status details, and complete file paths. Compute alignment from the rows actually present, and reduce optional alignment padding on constrained widths before wrapping any content; an impossible narrow rectangle must preserve complete source content rather than force a column that leaves no value space. Add explicit alignment and long-path/narrow-layout assertions.

## Approved Refinement: One Template for All Login States

The maintainer clarified that styling must cover the login forms themselves, not just provider/method lists. The supplied Xiaomi API-key form still had a package-purple heading, a double-inset prompt below a blank gap, and an unthemed input chevron. Thinking Level is the required template: live accent-bold title, muted description on the next row, a blank row, accent `>` input, shared one-cell inset, and standard rules/footer.

Apply one shared login renderer to every provider and every state: API-key/prompt/placeholder, manual code, browser URL/instructions, device code, details/info/links, waiting, progress, submitted values, nested return, cancel, and completion. Preserve source text, hyperlink targets, URL-copy and device-confirm actions, prompt results including blank optional answers, error/cancel semantics, and comparison presentation. All roles resolve from the active theme at render time; never use provider-specific branches or literal green. Keep URLs/control text safe and preserve best-effort shell-free browser launching.

Use a deferred attributed owned login presenter with the same behavioral contract as the pinned component if public presentation slots cannot provide the consistent layout. Retain the pinned component for comparison. Add theme-role and geometry assertions across all state transitions and multiple synthetic provider names, plus interaction tests for prompt/cancel, device actions, URL-copy, nested restoration, and live theme changes.

## Approved Refinement: Configured Provider Status

The maintainer requested success-green configured status for an alternate configured method and requested replacing `✓ stored` with configured wording, a retained separator dot, and a right-hand checkmark. Bare-A1 rows now display ` • configured ✓` for the matching method or ` • subscription configured ✓` / ` • API key configured ✓` for an alternate configured method. The dot remains muted; status and trailing checkmark use the same live success role. Storage/environment source labels are no longer rendered in the bare-A1 status suffix, but the authoritative status, configured method, provider identity, selection actions and credentials are unchanged. Unconfigured rows remain ` • not configured` without a checkmark, and comparison presentation stays pinned.

The preceding exact-head CI failure was an obsolete `Detached choice` expectation in the shell-host overlay test; the approved internal title policy correctly renders `Detached Choice`. Update only that expectation, retaining the attachment, overlay visibility, and terminal-write assertions.

## Approved Refinement: Remove Decorative Provider Badges

The maintainer asked what the diamond-like `✦` markers beside OpenRouter and Radius represent and requested removing them when they have no functional representation. The pinned source labels them preferred partner providers. In A1's alphabetically ordered selector they are a hard-coded decorative suffix, independent of credentials, configured status, capabilities, active model or actions. Remove that suffix only from owned provider rendering; retain real status dots/checkmarks, auth-type qualifiers, names, order, filtering and actions. Comparison rendering remains pinned and can still show its original badge.

## Approved Refinement: Dim Status-Bar Name Truncation

The maintainer requested that the session-name truncation symbol match the name's dim grey instead of default white. The vendor truncator inserts an SGR reset before its ellipsis, so painting the already-truncated string with an outer dim wrapper does not retain the marker's foreground. Its clipped string can also carry reset sequences into the per-grapheme reveal path.

Keep clipping as plain text at the session-name adapter boundary, then apply dim styling to settled names and markers. During truecolor reveals, keep the inserted ellipsis dim while ordinary name graphemes retain the existing secondary-accent animation. Preserve complete authoritative names, animation timing, width allocation, model position, gutters and comparison presentation. Add settled and animated clipping assertions across widths, themes and terminal color modes.

## Approved Refinement: Only Configured Wording

The maintainer clarified that the green suffix must say only `configured`, including the pictured previously qualified `subscription configured` case. This supersedes the earlier alternate-method qualifier decision: every configured bare-A1 provider suffix is exactly ` • configured ✓`. Keep the muted dot and success-green text/checkmark, omit both method and source qualifiers from this suffix, and retain actual auth-method metadata and IDs for workflows. Unconfigured rows and pinned comparison presentation remain unchanged.

## Implementation Evidence

- Session Info uses a bounded input-route adapter with component-local pointer routing and shared reference rendering. Escape and Ctrl+C close even before its deferred document resolves. Semantic identity/group rows share a left-aligned value column, reduce optional padding on narrow frames, and retain complete wrapped paths and values.
- Internal styling is profile-gated at the shared component-factory boundary, including nested authentication, generic choices, retained model/fork pickers, and login headings. Provider, method, trust, Launcher and Settings choices wrap Up/Down; paging, section jumps and document scrolling retain their semantics. Trust values are aligned without the saved-path suffix.
- Skills, provider and trust controllers are deferred behind a presentation hold to keep the existing startup reachability limits; unchanged controls/content and early-input/disposal remain covered. Shared generated palette data now includes startup-safe selection backgrounds and is emitted compactly without changing its existing progress roles.
- Build, typecheck, strict OpenSpec validation, architecture boundaries, pinned-source provenance, and palette synchronization passed. The final refinement run passed fifteen focused test files (289 tests), covering shared choice movement, Launcher, Settings, nested authentication, provider parity, trust, report alignment/wrapping, routes, Skills, and extension isolation. Changed-file documentation checks pass after repairing the four CI-reported DOC005 comment prefixes.
- No broad local regression suite was run; required finalized-head CI remains authoritative. Interactive terminal review remains optional; the agent did not perform it, and the maintainer supplied the refinement screenshots.

## Login Template Evidence

- One deferred owned login presenter now supplies every provider's prompt, manual-code, browser URL/instructions, device-code, details/info/links, waiting/progress, submitted-value and nested return states. All text rows are zero-inset internally and receive the shared frame's single inset.
- Active descriptions follow the heading immediately; a blank row separates the description/optional placeholder from the live accent-chevron input. Prior authorization context and submitted answers remain available beneath the current prompt.
- Title, chevron, description, links, rules and shortcut roles resolve at render time. Tests cover three synthetic provider names, dark/light appearances, several accents and truecolor/256-color modes without provider-specific code.
- Deferred state calls and early input replay in order; early cancellation rejects pending answers and prevents resurrection. Copy feedback/device-confirm actions are lifetime-guarded. Safe web URLs use encoded hyperlinks and best-effort shell-free browser argv without a project cwd; non-web targets/control payloads do not get execution or raw terminal control authority.
- The final login refinement passed build, typecheck, architecture/startup budgets, pinned-source provenance, changed-file documentation, strict OpenSpec validation and eight focused test files (146 tests). Existing prompt, optional blank answer, nested flow, cancel, comparison and extension-isolation assertions remain in place. No broad local regression suite or agent-driven interactive provider login was performed; required CI remains authoritative.

## Configured Status Evidence

- Bare-A1 configured suffixes retain the muted dot and render matching or alternate configured-method text plus the trailing checkmark through the live success role. Unconfigured rows remain muted with no checkmark; raw storage/environment labels are omitted only from this owned status suffix.
- Both truecolor and 256-color tests cover dark/light themes, multiple accents, selected/unselected rows, matching OAuth/API-key status, environment-backed credentials, alternate configured methods, clipping and unchanged selection actions. Comparison parity assertions retain the pinned source-label format.
- The CI-reported overlay failure was repaired by updating only the expected approved title casing to `Detached Choice`. The shell-host test retains its visibility and terminal-write assertions and passes.
- Build, typecheck, strict OpenSpec validation, architecture, provenance and changed-file documentation passed. Four focused test files passed (53 tests); finalized-head CI remains authoritative.

## Provider Badge Removal Evidence

- Owned OpenRouter and Radius rows omit only the decorative `✦` suffix. Real configuration dots/checkmarks and method qualifiers, provider names, existing order, filtering and selection actions remain intact.
- Provider parity fixtures now cover both names with owned badge absence, pinned comparison badge presence, retained configured/unconfigured state and identical selected provider IDs.
- Build, typecheck, strict OpenSpec validation, architecture, provenance and changed-file documentation passed. Three focused test files passed (52 tests); required finalized-head CI remains authoritative.

## Dim Footer Name Evidence

- Regression assertions reproduced default-white session-name ellipses before the fix in both truecolor and 256-color modes. The adapter now strips truncator control sequences before styling/segmentation and paints reveal ellipses through the existing dim role.
- Width/phase tests cover dark/light themes, multiple accents, settled names and shimmer/reveal/settle frames, asserting dim markers, stable model columns, bounded widths and no exposed reset fragments. Existing reveal timing/grapheme and comparison assertions remain intact.
- Build, typecheck, strict OpenSpec validation, architecture/startup limits, provenance and changed-file documentation passed. Three focused files passed (58 tests); required finalized-head CI remains authoritative.

## Simplified Configured Label Evidence

- Every configured bare-A1 suffix is exactly ` • configured ✓`, including alternate configured methods and environment-backed credentials. The separate provider/method metadata and workflow IDs are unchanged.
- Matching and alternate method style cases assert the exact suffix plus muted-dot/success-text/checkmark roles. Pinned comparison fixtures retain their original qualified/status-source wording.
- Build, typecheck, strict OpenSpec validation, architecture, provenance and changed-file documentation passed. Two focused provider test files passed (29 tests); finalized-head CI remains authoritative.

## Open Questions

None for the described Session Info, sign-in, and project-trust updates. Additional UX requests are not inferred and require scope refinement in the same PR.

## Known Gaps

None identified in the approved implemented scope. Live provider sign-in remains optional maintainer validation and was not performed by the agent.
