## MODIFIED Requirements

### Requirement: Footer controls offer draft-preserving direct editing

Bare A1's visible session name, active model name, and thinking level SHALL independently highlight on hover using the subtle live accent-selected background while retaining their ordinary foreground. Each control's hover and click target SHALL fit its visible text only and SHALL NOT insert blank side characters. Hover SHALL NOT shift layout or cover neighboring labels, thinking separators, or unrelated metadata. With no owned dialog open, a normal left-click SHALL directly open Session Name, Models, or Thinking Level respectively, without a context menu or prompt submission.

When the existing provider-count and width rules show a provider qualifier, bare A1 SHALL render it in square brackets immediately after the active model name and before the thinking-level separator, as `model [provider] • level`, matching the Models dialog. The model name, connecting space, and visible bracketed provider SHALL share one hover/click target that opens Models. The thinking separator and level SHALL remain outside that target; omitting the qualifier SHALL shrink the model target to its visible model text. Existing qualifier visibility, omission before clipping higher-priority content, routed-model meaning, foreground roles, and comparison-profile formatting SHALL remain unchanged.

Opening, submitting, or cancelling these dialogs SHALL retain the ordinary prompt draft and its attachments. Footer hover SHALL remain active while a dock dialog is open. A primary press on any footer control outside an open cancellable owned dialog SHALL cancel only that dialog through its ordinary cancel lifecycle without saving edits; the complete gesture SHALL be consumed before footer activation or prompt selection. Clicking a different footer control SHALL NOT immediately replace the open dialog. A later independent click with no owned dialog open MAY open the requested control, including when its optional components require preparation. Active control identity SHALL come from semantic metadata, not rendered titles, and SHALL work for footer-opened and slash-opened dialogs. Floating overlays SHALL block background footer activation; an explicitly cancellable owned floating dialog MAY dismiss on that outside press without passing it through. Hit testing SHALL follow explicit current painted spans, including clipping, gutters, suppressed fields, and resize. Invisible, unnamed, missing-model, suppressed-level, comparison-profile, and extension-replaced footer controls SHALL expose no fabricated target. The initiating pointer gesture SHALL NOT propagate to an opened dialog or underlying prompt.

#### Scenario: Hover and directly edit a footer name

- **WHEN** the pointer enters the visible footer-name text
- **THEN** only that text SHALL receive subtle hover background without extra spaces or layout shift
- **WHEN** the user normally left-clicks the target with no owned dialog open
- **THEN** the fully selected name dialog SHALL open directly without a context menu

#### Scenario: Keep an entered prompt through footer editing

- **WHEN** the user has an ordinary prompt draft with attachments and clicks a footer control with no owned dialog open
- **THEN** its corresponding dialog SHALL open without sending or clearing that draft
- **WHEN** the user submits or cancels the dialog
- **THEN** the prompt draft and attachments SHALL remain available for continued editing

#### Scenario: Open model and thinking selectors consistently

- **WHEN** the user hovers and left-clicks the visible model name with no owned dialog open
- **THEN** it SHALL use the shared text-only hover target and open Models
- **WHEN** the user hovers and left-clicks the visible thinking level with no owned dialog open
- **THEN** it SHALL use the same treatment and open Thinking Level

#### Scenario: Toggle an open dock dialog from the footer

- **WHEN** Session Name, Models, or Thinking Level is open in the dock and the pointer enters a footer control
- **THEN** its text SHALL still highlight on hover
- **WHEN** the user clicks the control again outside the dialog
- **THEN** the active dialog SHALL close through its ordinary cancel lifecycle without committing edits or losing the prompt draft and attachments
- **AND** the remaining gesture SHALL NOT activate a footer control or select the restored prompt

#### Scenario: Render the provider after the model

- **WHEN** the bare-A1 footer has multiple providers and sufficient width for its optional provider qualifier
- **THEN** it SHALL render `model [provider] • level` rather than `(provider) model • level`
- **AND** hovering any cell of the model or bracketed provider SHALL highlight the full `model [provider]` label without changing its foreground
- **AND** clicking the provider or either bracket SHALL open Models when no dialog is open, or dismiss the current cancellable owned dialog without opening Models in that same gesture
- **WHEN** the qualifier no longer fits or the existing provider-count rule omits it
- **THEN** the model and level targets SHALL remain aligned with their visible text
- **AND** the comparison profile SHALL retain its established qualifier format

#### Scenario: Replace the dialog from a different footer control

- **WHEN** Session Name, Models, or Thinking Level is open and the user clicks a different footer control outside the dialog
- **THEN** only the active dialog SHALL cancel and the requested replacement SHALL NOT open in that gesture
- **AND** unsaved edits SHALL NOT apply and prompt text, selection, and attachments SHALL remain retained
- **WHEN** the user independently clicks the requested control after dismissal
- **THEN** its dialog SHALL open through its ordinary deferred presentation path
- **WHEN** the user clicks the same control as the active dialog
- **THEN** it SHALL close like ordinary cancellation rather than reopen

#### Scenario: Bound footer interaction to painted geometry

- **WHEN** footer controls are clipped, suppressed, absent, or resized
- **THEN** only their currently visible text spans SHALL be interactive
- **AND** neighboring metadata and comparison or extension-replaced footers SHALL NOT acquire those targets
