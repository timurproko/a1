## ADDED Requirements

### Requirement: Owned dialogs support independent text-only mouse hover

Bare A1's owned selectable dialogs SHALL represent pointer hover independently from their keyboard-active item. Moving the pointer SHALL NOT change the keyboard-active identifier, navigation marker, active-row background, Enter target, or other keyboard action target. A hovered actionable text span SHALL use a foreground blend of 75% of that span's ordinary foreground and 25% of the current semantic accent. The shared theme boundary SHALL own blending and terminal-default/truecolor/256-color resolution. Hover SHALL preserve existing semantic foreground distinctions, attributes, and keyboard-selection backgrounds and SHALL NOT introduce a background, reverse video, underline, or pure-accent foreground replacement.

This policy SHALL apply to Launcher, shared A1-owned selectors, in-place Models, and Settings configure dialogs. The pinned `a1 pi` comparison profile, opaque extension-owned surfaces, non-cancellable progress surfaces, and existing scalar Settings value menus SHALL retain their existing policy.

#### Scenario: Hover a different item from keyboard selection

- **WHEN** keyboard navigation has made item A active and the pointer moves over item B
- **THEN** only B's actionable text SHALL receive the blended hover foreground
- **AND** A's active marker and background SHALL remain unchanged
- **AND** Enter SHALL still act on A

#### Scenario: Keep mouse hover text-only

- **WHEN** an actionable span is hovered on either a selected or unselected row
- **THEN** only its foreground SHALL acquire the shared accent blend
- **AND** its background, text attributes, displayed width, and neighboring spans SHALL retain their ordinary presentation

#### Scenario: Refresh the hover palette

- **WHEN** the current theme or session accent changes while an owned dialog is open
- **THEN** its hover foreground SHALL be derived from the new ordinary text colors and accent through the existing terminal color capability path
- **AND** no route-specific RGB or fixed white foreground assumption SHALL be required

#### Scenario: Leave or replace a target

- **WHEN** the pointer leaves a target or its target disappears through filtering, refresh, step transition, replacement, cancellation, or disposal
- **THEN** the former target SHALL NOT retain its hover treatment or remain clickable through stale coordinates

### Requirement: Owned dialog clicks use semantic targets and cancel without click-through

A primary-button press on a visible actionable owned-dialog choice or control SHALL invoke that target's existing semantic action, independently of the keyboard-active item. Hit regions SHALL be derived from the same current layout as the painted text, including clipping, scrolling windows, dialog insets, and terminal offsets. Blank areas and non-actionable hints SHALL NOT become inferred controls. A primary press outside the complete painted bounds of the topmost cancellable owned dialog SHALL invoke its existing cancellation lifecycle and consume the whole dismissal gesture without selecting, activating, or dragging any underlying surface. Pressing panel padding SHALL NOT dismiss the dialog. Wheel and non-primary reports SHALL NOT dismiss or activate a choice.

Outside cancellation SHALL close or resolve the workflow rather than merely hide it, stop dialog-owned deferred work through its existing lifecycle, and restore the prior surface. It SHALL NOT save pending edits or roll back changes already applied by existing actions. Stale or unpainted geometry SHALL NOT authorize an action. Existing keyboard behavior and input editing SHALL remain available.

#### Scenario: Click an item other than the keyboard-active one

- **WHEN** A is keyboard-active and the user primary-clicks visible actionable item B
- **THEN** B's existing semantic action SHALL run exactly once
- **AND** pointer motion before that click SHALL NOT have moved the keyboard selection to B

#### Scenario: Dismiss without underlying input

- **WHEN** the user primary-presses outside the topmost cancellable owned dialog and then moves and releases
- **THEN** only that dialog SHALL cancel
- **AND** the press, motion, and release SHALL NOT activate another dialog, click a setting, or start underlying text selection
- **AND** later independent gestures SHALL work on the restored surface

#### Scenario: Match the current painted window

- **WHEN** a dialog filters, scrolls, centers, clips, or resizes
- **THEN** only choices in the newly painted geometry SHALL be actionable at their displayed positions
- **AND** stale geometry SHALL NOT select a formerly visible item

#### Scenario: Preserve non-action pointer behavior

- **WHEN** a wheel or non-primary report occurs inside or outside an owned dialog
- **THEN** it SHALL NOT activate a choice, write a setting, or dismiss the dialog
- **AND** existing wheel behavior SHALL remain available

### Requirement: Ordinary Settings hover shares the dialog foreground blend

The shared Settings list-row renderer SHALL apply the same 75% ordinary-foreground / 25% current-accent text-only hover used by owned dialogs to hovered labels, muted values, and enabled numeric controls. Hover SHALL NOT replace a muted value with pure terminal white, add a background, move the keyboard-active row, or change the value's write behavior. Keyboard-active row backgrounds, alignment, clipping, disabled-control treatment, and ordinary non-hover semantic roles SHALL remain unchanged. Theme adapters without a hover painter SHALL retain their ordinary foreground treatment rather than fabricate an accent.

#### Scenario: Hover a value while another row is keyboard-active

- **WHEN** the pointer rests on a Settings value belonging to a row other than the keyboard-active row
- **THEN** the value SHALL receive the shared accent blend based on its normal muted foreground
- **AND** the keyboard-active row and Enter target SHALL remain unchanged

#### Scenario: Hover labels and enabled controls

- **WHEN** the pointer rests over a Settings label or enabled numeric minus/plus control
- **THEN** only that actionable text SHALL receive the same foreground blend
- **AND** no new background SHALL be introduced and disabled controls SHALL retain their disabled presentation

## MODIFIED Requirements

### Requirement: Unified Models uses the existing in-place input surface

Bare A1 SHALL present unified Models in the Agent input dock using its pre-Apps layout and styling, not a floating modal. Its controller SHALL remain deferred, and opening SHALL present the completed dialog atomically without loading or refresh-status text. `/models` and effective explicit selection bindings SHALL open it; default Ctrl+M SHALL only cycle models. The selector SHALL preserve its controls, prompt restoration, non-dismissing outside wheel scrolling, and exact compact/resize frame dimensions. Its mouse hover SHALL be independent of keyboard selection and follow the shared text-only foreground blend. Clicking model text or its provider SHALL select that model through the existing switch workflow; clicking its scope circle SHALL toggle only that model's session cycling scope; clicking `all` or `scoped` SHALL select that filter. An outside primary press SHALL cancel Models and consume its whole gesture before ordinary transcript selection can begin.

#### Scenario: Open model selection in place

- **WHEN** bare A1 receives `/models` or an effective explicit model-selection binding
- **THEN** the unified Models selector SHALL replace the Agent input surface using the established in-place presentation
- **AND** no centered floating Models overlay or full-screen dimmed backdrop SHALL be introduced

#### Scenario: Open without an intermediate status frame

- **WHEN** the deferred Models controller is preparing
- **THEN** the existing terminal frame SHALL remain visible until Models is ready
- **AND** no loading or refresh-status message SHALL flash before the completed selector
- **AND** early input and cancellation SHALL remain supported without hiding actual failures

#### Scenario: Restore the prompt

- **WHEN** the reader cancels Models or completes model selection
- **THEN** the selector SHALL close and the existing prompt draft, attachments, and ordinary input focus SHALL be restored

#### Scenario: Edit the cycling scope

- **WHEN** the reader searches, changes all/scoped filtering, toggles a model or provider, reorders the scope, or saves it
- **THEN** the in-place selector SHALL retain the existing unified Models semantics and effective keyboard actions

#### Scenario: Click a model without redirecting keyboard hover focus

- **WHEN** model A is keyboard-active and the user hovers model B
- **THEN** A SHALL remain the Enter target and B SHALL receive only the text-hover blend
- **WHEN** the user clicks B's model text or provider
- **THEN** the existing switch workflow SHALL target B and close on success

#### Scenario: Click a scope marker or filter

- **WHEN** the user clicks B's scope circle while A is keyboard-active
- **THEN** only B's session scope membership SHALL toggle without switching the active model or saving the scope
- **WHEN** the user clicks `all` or `scoped`
- **THEN** the matching filter SHALL become active through the existing filter semantics

#### Scenario: Interact with the transcript

- **WHEN** the reader sends wheel input outside the in-place Models input surface
- **THEN** ordinary transcript scrolling SHALL remain available without becoming selector input or dismissing Models

#### Scenario: Cancel before a transcript selection gesture

- **WHEN** the reader primary-presses outside the in-place Models input surface
- **THEN** Models SHALL cancel and restore the prompt
- **AND** that gesture SHALL NOT select transcript text or act on a footer control
- **AND** a later independent transcript-selection gesture SHALL work normally

#### Scenario: Resize the in-place selector

- **WHEN** the terminal is compact or resizes while Models is open
- **THEN** the in-place selector SHALL preserve requested frame dimensions and usable controls
- **AND** its mouse targets SHALL match only its currently painted controls and rows
