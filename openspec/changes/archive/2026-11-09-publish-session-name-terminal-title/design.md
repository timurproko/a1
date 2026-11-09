# Design

## Context

See `proposal.md` for motivation and scope. The provided external plan is an input, not an authoritative repository artifact.

At base `47397a0a5b680ed23515a914597d42c489e691ea`, `PiEngineAdapter.view()` delegates to `projectSessionView()`, and `#emitView()` invalidates adapter state before publishing the authoritative view. `PiSessionEvents` does not handle `session_info_changed`, although pinned Pi's `setSessionName()` persists through its session manager and emits that public event. The owned name workflow already explicitly emits a view, which supports test/fake sessions without event emission.

`OwnedUiSessionPresenter` already reads the session view, distinguishes `custom-viewport` from comparison layout, and routes extension title writes through `OwnedUiPresenterTerminal.setTitle()`. That terminal handle guards terminal-wide title writes by attachment. `start()`, `activated()`, and authoritative view synchronization are the relevant presentation boundaries. Streamed transcript-block updates take a separate fast path.

The source plan predates the single-agent pivot. Current product architecture has no resident host, tabs, or cross-process switching. The host/presenter seam still supports attachment tests; its existing ownership rules remain relevant without becoming a new product surface.

## Goals / Non-Goals

**Goals:** Keep session data authoritative in the engine and terminal presentation in the shell; make title publication bounded, safe, and compatible with temporary extension overrides.

**Non-Goals:** New engine contracts, proprietary host IPC, screen parsing, direct OSC emission, new settings, resident UI, terminal restoration policy changes, or new automatic title behavior in `a1 pi`.

## Decisions

### 1. Translate Pi's public metadata event into an authoritative view

Add a `session_info_changed` case in `PiSessionEvents` that uses the existing `emitView` port. Read the name through the session manager when the adapter projects its view, not by trusting or caching the event's `name` payload. Keep the explicit publication in the owned name workflow: duplicate engine views are safe and avoid changing fake/session compatibility.

Alternative rejected: deriving the title from `/name` command results misses extension, API, and other public Pi event sources. An engine-level product fallback or terminal-title event would incorrectly move presentation policy into the engine contract.

### 2. Keep a small private core-title synchronizer in the presenter

Derive the title from `view.status.footer?.sessionName`, normalize it, and fall back to `PRODUCT_IDENTITY.displayName`. Preserve ordinary Unicode, spaces, emoji, and emoji joiners. Replace runs of C0/C1 controls, DEL, and Unicode line/paragraph separators with a space and trim outer whitespace; use the fallback if the result is empty. This removes ESC, BEL, ST, newline, and carriage-return controls without replaying an escape sequence. Printable remnants of an attempted sequence are inert title text. Do not modify the persisted session name.

Publish only for a started, non-disposed, attached bare-A1 presenter whose terminal is running. Track the last core-derived normalized title actually written, not the terminal's assumed current title. Do not advance this memo when a presenter is inactive or before terminal startup.

Alternative rejected: writing every view/render clobbers extension titles and adds redundant terminal traffic. Reading or mirroring the runtime's current title is unnecessary and would confuse extension ownership with the last core logical title.

### 3. Synchronize at lifecycle/view boundaries, not the streaming/render path

- After starting the terminal, publish the initial or resumed session title before binding extension UI, so an extension's subsequent startup title remains usable.
- Synchronize when the authoritative view is refreshed, including `/name`, public metadata events, and rebinding after new/resume/fork/clone/session replacement. Deduplicate even if both workflow and Pi event publish the same view.
- On activation of an already-started presenter, force one republish even if its core title has not changed. Attachment before startup must not produce a premature write; startup owns the first publication.
- Do not add title work to rendering, transcript-block streaming, or chunk processing. A later activation reads fresh authoritative state even if the name changed while inactive.

The existing handle's attached guard remains the final ownership boundary. No runtime access or host redesign is required.

### 4. Treat extension titles as temporary independent presentation

Extension `setTitle()` continues through the existing terminal handle without changing the core-title memo. An unrelated view update with the same normalized session title does not write. A changed session-derived title or presenter activation intentionally restores core ownership. A session replacement that produces the same logical title alone does not trigger a redundant write.

### 5. Add focused tests at the owning boundaries

Extend `TestPresentationTerminal` to record title writes without changing production contracts. Add engine event routing tests and an adapter-level assertion that changing/clearing the authoritative manager name produces the correct footer, including a mismatched event payload to prove authority.

Shell cases cover unnamed/named startup and resume, direct and repeated `/name`, metadata events, clearing, new/resume/fork/clone rebinding, safe control normalization and Unicode, no repeated writes for unchanged views/status/streaming, and no new automatic title in comparison layout. Exercise supported rebinding workflows through existing fixtures rather than duplicating the synchronizer in tests.

Host cases cover an inactive presenter's startup/name changes, attachment of a second named presenter, reattachment of the first, activation before startup, and close/disconnect preventing stale writes. These are host ownership tests, not resident-tab acceptance. Extension coexistence covers a temporary `Working...` title surviving unrelated updates and yielding to a rename or activation.

## Risks / Trade-offs

- [Attachment happens before runtime startup] → Gate publication on running/started state and assert the initial title is published once after startup.
- [Duplicate workflow and Pi metadata views] → Memoize only the core normalized title at the presenter boundary.
- [Inactive updates poison deduplication] → Record only successful eligible core publications and force fresh publication on activation.
- [Persisted names contain terminal controls] → Normalize in presentation and assert no control characters survive; do not mutate stored data or strip emoji joiners.
- [Pinned comparison parity regresses] → Gate automatic title behavior by `custom-viewport`; retain extension title support in both profiles.
- [Terminal hosts format or ignore standard titles differently] → Assert the existing `setTitle()` port; Herdr-specific sidebar formatting is optional maintainer observation, not a new API or automated certification claim.

## Migration Plan

No data migration or dependency changes. After approval, implement in the same draft PR, add focused tests with each outcome, and run only targeted checks plus typecheck and strict change validation. Complete detailed tasks and gap disposition, add plain Acceptance outcomes, reconcile current `origin/develop`, and check the final Implementation item last. Trusted automation owns readiness, finalization, and CI; maintainer integration remains separately authorized.

Rollback through a normal corrective change can remove automatic publication and event handling without rewriting saved sessions. Existing extension title calls remain independent.

## Implementation Notes

The maintainer approved this plan and explicitly requested implementation in the same interaction. The approved behavior and PR Implementation outcomes remain unchanged.

The existing class-size ratchet prohibits growing the presenter. Its private title synchronization therefore lives in a small same-owner `SessionTerminalPresentation` collaborator alongside the existing terminal-progress synchronization. The presenter retains lifecycle and attachment authority and invokes the collaborator at exactly the planned boundaries. Moving progress into the collaborator replaces the existing progress-enabled field rather than adding another presenter field; the presenter's method count drops from 55 to 54 without changing progress behavior. This is internal decomposition, not a new contract or product capability.

The event handler's existing record validation and usage invalidation move into `handle()` inside its existing cleanup guard. The long event switch consequently shrinks from 149 to 148 lines while gaining metadata-event handling. The size baseline is lowered, not relaxed. The startup baseline is repinned to the exact required initial-render graph: 198 modules and 1,754,501 normalized source bytes, an increase of one small presentation module and 1,891 bytes. No optional module, new dependency, or expensive startup work is added.

Tests are concentrated in the new `session-shell-titles.test.ts` suite rather than spreading the cohesive title contract across existing large shell suites. Engine routing and authoritative projection tests stay in their existing owner suites.

## Focused Validation

- Build and typecheck pass in the task worktree.
- 105 tests pass across the engine event/adapter suites and shell title, lifecycle, and host suites, covering title behavior plus the unchanged terminal-progress lifecycle.
- Architecture boundaries and the reduced size ratchet pass; strict OpenSpec change validation passes.
- Required exact-head CI remains workflow-owned after completion. No physical terminal-host result is asserted.

## Known Gaps

No known implementation gaps. Host-specific sidebar formatting is outside the standard-title contract; physical Herdr observation remains optional maintainer validation and is not claimed by automated tests.
