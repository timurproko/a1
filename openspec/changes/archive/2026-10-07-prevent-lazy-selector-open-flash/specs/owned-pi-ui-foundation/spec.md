## ADDED Requirements

### Requirement: Lazy selector opening does not expose the ordinary prompt

Bare A1 SHALL keep optional Thinking Level and Session Tree component code outside the eager startup graph and MAY prepare those modules only after the first input-ready frame. Once either selector is invoked, the shell SHALL install the requested replacement surface as the first presented post-submit input state. It SHALL NOT expose, clear to, or flash the ordinary prompt while component preparation or selector construction is pending.

The same Session Tree behavior SHALL apply to `/tree` and the configured double-Escape tree action. Preparation SHALL be idempotent, SHALL share in-flight work, and SHALL NOT make startup fail. If required component preparation fails, the shell SHALL end any presentation coordination, restore usable ordinary input, and report the command failure without an unhandled rejection or stale replacement surface. Selector content, interaction, focus, cancellation, nested transitions, footer behavior, and `a1 pi` comparison-profile behavior SHALL remain unchanged.

#### Scenario: Open Thinking Level after startup
- **WHEN** the user invokes `/thinking` in bare A1 after the first input-ready frame
- **THEN** the Thinking Level selector SHALL be the first presented post-submit input surface
- **AND** no intermediate frame SHALL expose or flash the ordinary prompt

#### Scenario: Open Session Tree from the command
- **WHEN** the user invokes `/tree` in a nonempty bare-A1 session
- **THEN** Session Tree SHALL be the first presented post-submit input surface
- **AND** no intermediate frame SHALL expose or flash the ordinary prompt

#### Scenario: Open Session Tree from double Escape
- **WHEN** the configured double-Escape action opens Session Tree
- **THEN** Session Tree SHALL replace the ordinary input surface without an intervening ordinary-prompt presentation

#### Scenario: Prepare optional selectors after the first frame
- **WHEN** bare A1 reaches its first input-ready frame
- **THEN** it MAY begin bounded preparation of the Thinking Level and Session Tree modules
- **AND** those optional modules SHALL remain absent from the eager startup graph
- **AND** repeated or concurrent preparation SHALL share the same module work

#### Scenario: Selector preparation fails
- **WHEN** a required Thinking Level or Session Tree module cannot be prepared
- **THEN** startup SHALL remain usable
- **AND** invoking the affected selector SHALL restore ordinary input and report a command failure
- **AND** no presentation hold, stale replacement surface, or unhandled rejection SHALL remain
