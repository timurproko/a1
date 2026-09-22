## Context

`OwnedUiSessionShellRoot.appendWorkflowStatus` already stores informational results in `#dockNotice` for the custom-viewport profile. `#renderDockLayout` places that notice after non-live status rows and before above-editor widgets and the editor, so it stays close to the prompt and outside transcript semantics. By contrast, `appendWorkflowMessage` sends `error` and `warning` messages through `#appendAnchoredWorkflowComponent`. In an empty session that anchored component is the only document content and remains at the top of the viewport, producing the reported gap.

The same command-message presenter already owns error/warning prefixes, severity roles, padding, and wrapping. The placement change therefore does not require new visual grammar or changes to engine result wording.

## Goals / Non-Goals

**Goals:**
- Put simple command errors and warnings in bare A1's existing prompt-adjacent notice region.
- Preserve exact severity presentation and message wording.
- Keep one current notice across informational, warning, and error messages with deterministic replacement and dismissal.
- Keep notices out of transcript selection, copying, prompt navigation, persistence, and scrolling.
- Preserve pinned `a1 pi` placement and structured transcript presentations.

**Non-Goals:**
- Changing which workflows succeed or fail, or rewriting their messages.
- Moving structured output such as session info, hotkeys, changelog, new/name/debug presentations, or celebratory components into the dock.
- Changing live working status, queue rows, viewport navigation, modal ownership, or extension widget placement.
- Adding timed toast dismissal, notice history, or stacked notifications.

## Decisions

### 1. Generalize the existing dock notice to retain message kind

Store the current notice as a typed workflow message rather than a bare string. In the custom-viewport profile, route `status`, `warning`, and `error` messages through that one notice state. Render status messages with the existing dim status presenter and render warnings/errors with the existing command-message presenter, so `Error:`/`Warning:`, severity colors, one-cell rules, wrapping, and leading spacer remain owned by the established presenters.

The pinned profile keeps the current paths: status messages remain anchored/coalesced transcript status, and warning/error messages remain chronological transcript command messages.

Alternative rejected: convert every message to dim status text. That would satisfy placement but lose the failure prefix and semantic severity shown in the report.

### 2. Use one newest-notice replacement rule across severities

A new status, warning, or error replaces the current dock notice in place. This prevents a stack from growing above the prompt and matches the existing informational behavior. A later informational result may therefore replace an error, and a later failure may replace an informational acknowledgement; the visible notice always represents the latest simple workflow message.

A submitted user prompt or shell command, a structured transcript-bound workflow presentation, or workflow/session reset clears the notice. Assistant, tool, custom, compaction, and working-state updates do not clear it. No timer is introduced.

Alternative rejected: retain every error until session reset. That would create a second transcript in the dock and steadily displace the editor.

### 3. Keep structured presentations and content semantics unchanged

Only the simple `PiWorkflowMessage` route changes in bare A1. Components intentionally mounted with `#appendAnchoredWorkflowComponent` remain document content and continue to clear a stale notice. Because the generalized notice remains in `dockRows`, it does not enter `documentRows`, transcript order, selection/copy, prompt anchors, persisted session state, or viewport scrolling. Existing dock measurement continues to account for multiline wrapping and editor pointer geometry.

Extension `info`, `warning`, and `error` notifications already enter the same status/message funnels and therefore receive consistent placement without a separate extension-specific implementation.

### 4. Prove placement and route isolation at the shell boundary

Focused tests will render the reported `/export` failure in an empty custom-viewport session and assert that it is immediately above the editor group, leaves the document range empty, retains exact red `Error:` presentation, and does not create a workflow transcript entry. Additional cases will cover warning presentation, cross-severity replacement, multiline wrapping, submitted-prompt/reset dismissal, extension notifications, and structured output clearing the notice.

Existing independent command-message parity tests remain the control for the unchanged pinned route. A focused pinned-shell assertion will confirm that the same error is still transcript content there.

## Risks / Trade-offs

- **[A failure becomes transient rather than transcript history]** -> This is the requested prompt-adjacent behavior; retain it until the next reader submission, structured presentation, replacement notice, or reset rather than using a short timer.
- **[Severity styling regresses while moving regions]** -> Reuse the existing command-message presenter and assert ANSI roles/prefixes as well as plain text and geometry.
- **[A multiline notice changes dock height]** -> Continue using normal dock measurement so viewport allocation and editor pointer rows update together; test wrapping at a narrow width.
- **[Pinned parity changes accidentally]** -> Guard routing by the existing custom-viewport profile and retain independent pinned command-message evidence.
- **[Structured output is unintentionally moved]** -> Generalize only the simple workflow-message funnel; leave explicit component routes anchored and cover one structured command in regression tests.

## Implementation Evidence

To be completed after plan approval and implementation.
