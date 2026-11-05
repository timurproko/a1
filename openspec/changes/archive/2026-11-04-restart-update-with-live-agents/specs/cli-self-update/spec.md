## ADDED Requirements

### Requirement: Transient continuity inspection delays recover without user repair

For supported resident runtimes, background update SHALL complete candidate activation without requiring agents to become idle, windows to close, state deletion, or manual reinstall. A transient continuity-inspection timeout SHALL retain the exact certified candidate and the previous usable active release, preserve live execution, and receive bounded automatic activation-only retries. Inspection SHALL keep bounded work and authenticated source identity checks; timeout alone SHALL NOT be treated as proof of incompatibility or readiness.

#### Scenario: Healthy sources encounter a transient inspection delay
- **WHEN** a certified prepared update encounters a transient continuity inspection delay while supported agents are busy or waiting for input
- **THEN** the agents SHALL continue running unchanged while bounded activation-only retries resolve readiness
- **AND** a successful retry SHALL commit the candidate as active without repeating package replacement or requiring manual recovery

#### Scenario: Continuity cannot safely be established
- **WHEN** an authenticated compatibility check fails or a live source remains uninspectable
- **THEN** the prior verified active release and all live execution SHALL remain intact
- **AND** the updater SHALL NOT bypass compatibility checks or claim restart readiness

### Requirement: Restart update notification describes a usable user action

The normal update status SHALL show the existing green `Update installed, restart to update` text only when an approved successor is durably active and an ordinary app restart selects it. Technical prepared or activation-blocked state SHALL remain diagnostic rather than appearing as `Update prepared; activation blocked` in the normal status line. Replacing failure wording SHALL NOT manufacture installation success.

#### Scenario: User restarts after background installation
- **WHEN** an automatic update commits a compatible approved successor and the user restarts the resident app window after the green restart instruction
- **THEN** the restarted window SHALL run the new client and reconnect the same busy and input-waiting agents, workspace order, session authority, and outstanding interactions
- **AND** no agent or tool SHALL be killed, restarted, replaced, or lose work because of the client update
- **AND** new agents SHALL use the successor release and the satisfied update notice SHALL disappear

#### Scenario: Automatic activation has not completed
- **WHEN** a prepared candidate has not passed continuity verification and activation commit
- **THEN** normal status SHALL NOT display internal activation-blocked terminology or a false installed/restart-ready notice
- **AND** bounded diagnostic evidence SHALL retain the failure reason while safe automatic recovery continues
