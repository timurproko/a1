## MODIFIED Requirements

### Requirement: Suggestions are bounded and user-voiced
A1 SHALL expose only a single-line suggestion that represents one likely next user action in the user's voice. A valid suggestion SHALL contain between 2 and 12 words and fewer than 100 characters. A bounded set of established single-word affirmations, negations, actions, and slash commands SHALL also be accepted when every other candidate rule passes; that set SHALL include `approved`, `proceed`, `implement`, `merge`, and `archive` as inert approval/action replies. A1 SHALL reject multiple sentences, markup, terminal-control characters, model errors, meta-commentary about producing a suggestion, assistant-voiced text, evaluative pleasantries, and empty output.

A generated suggestion SHALL be data only. It SHALL NOT constitute approval, permission, command execution, or submission until the user explicitly accepts and submits it.

#### Scenario: Model returns a concise user response
- **WHEN** generation returns `go ahead and merge it`
- **THEN** A1 SHALL make that text eligible for presentation

#### Scenario: Model returns a recognized one-word approval or action
- **WHEN** generation returns `approved`, `proceed`, `implement`, `merge`, or `archive`
- **THEN** A1 SHALL make that complete word eligible for presentation under the same inert ghost-text lifecycle as a multi-word candidate

#### Scenario: Model returns assistant-voiced prose
- **WHEN** generation returns text beginning with wording such as `I'll`, `Let me`, or `Here's`
- **THEN** A1 SHALL discard it without changing the editor

#### Scenario: Model returns unsafe formatting or excess content
- **WHEN** generation returns multiple lines, Markdown formatting, terminal-control characters, multiple sentences, more than 12 words, or at least 100 characters
- **THEN** A1 SHALL discard it without displaying a truncated or partially accepted form

#### Scenario: Suggestion resembles authorization
- **WHEN** a valid suggestion says to continue, apply, implement, merge, deploy, archive, or perform another consequential action
- **THEN** A1 SHALL still treat it only as inert ghost text until the user accepts it into the editor and separately submits it

### Requirement: Prediction prioritizes a clear offered next action
For an otherwise eligible run, A1 SHALL instruct the suggestion model to prefer a clearly offered next action that agrees with the user's recent intent. When the final response explicitly requests one concrete user authorization or action and recent context already supports that direction, the instruction SHALL treat it as a strong prediction signal and SHALL direct the model not to abstain solely because the request is consequential, formally worded, or part of a governed workflow. The instruction SHALL direct the model to return only predicted user text and not call an available tool. An optional alternative SHALL NOT by itself be treated as evidence that no natural continuation exists.

The instruction SHALL distinguish a supported explicit next action from genuinely unresolved choices, contradictory user intent, and outstanding required assessment; those conditions SHALL retain the ability to produce no suggestion. Prediction SHALL remain contextual rather than a deterministic extraction of assistant wording. A1 SHALL NOT synthesize an approval from quoted assistant text when the model returns nothing, calls a tool, fails, or is cancelled. Existing eligibility, request-shape, candidate bounds, filtering, settlement, and explicit acceptance/submission requirements SHALL remain in force.

#### Scenario: Formal plan approval and implementation handoff
- **WHEN** recent user intent supports proceeding and the settled assistant response asks the user to approve a stated plan and explicitly request implementation
- **THEN** the suggestion request SHALL include that completed response and guidance favoring a concise user-voiced approval and implementation request
- **AND** the guidance SHALL tell the model to return text instead of invoking an available tool
- **AND** a timely current result such as `approved implement it` or `proceed` SHALL become inert ghost text when the ordinary editor is eligible

#### Scenario: Archive offer with an optional testing alternative
- **WHEN** the conversation records accepted merged work and the final assistant response says `Say archive it` to perform its stated closeout, with `let me test` offered only as an optional alternative
- **THEN** the suggestion request SHALL include the completed response and guidance favoring that concrete continuation rather than abstention solely because the optional alternative exists
- **AND** a timely current model result of `archive it` SHALL pass validation and appear when the ordinary settled editor is eligible
- **AND** that ghost text SHALL neither record acceptance nor perform archival until the user accepts and submits it

#### Scenario: Required validation remains outstanding
- **WHEN** the user has explicitly required testing before implementation or closeout and the conversation has not established that testing is complete
- **THEN** prediction guidance SHALL NOT favor approval, implementation, or archival merely because the assistant mentioned it
- **AND** a no-suggestion result SHALL remain valid

#### Scenario: Equally unresolved alternatives
- **WHEN** an assistant offers materially different choices without a clear default or user preference
- **THEN** prediction guidance SHALL preserve abstention instead of directing the model to select the first quoted response

#### Scenario: Empty or failed generation after a clear offer
- **WHEN** generation returns no suggestion, returns a tool call, or fails despite a clear offered next action
- **THEN** A1 SHALL leave the editor empty and classify the actual outcome in enabled private diagnostics
- **AND** A1 SHALL NOT insert an extracted approval, retry automatically, or execute the action as a fallback
