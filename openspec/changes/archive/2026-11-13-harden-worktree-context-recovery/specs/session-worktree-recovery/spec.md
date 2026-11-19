## ADDED Requirements

### Requirement: Authoritative worktree identity ignores inherited Git redirection

Session worktree enter, attachment and authoritative validation SHALL determine repository and worktree identity from their explicitly selected filesystem roots, independent of inherited Git repository-redirection variables. The policy SHALL NOT mutate the process environment or remove unrelated authentication and user environment. A session whose durable startup directory is not a Git repository SHALL reject enter/attach with an actionable diagnostic before persisting an association or acquiring a lasting claim. Existing same-repository, runtime-identity and ownership restrictions SHALL remain authoritative.

#### Scenario: Temporary overrides point at the target checkout

- **GIVEN** a session started outside a Git repository
- **AND** the issuing shell sets Git directory and worktree overrides to a valid task checkout
- **WHEN** it requests attachment
- **THEN** A1 SHALL reject the unsupported startup context without persisting a false startup identity
- **AND** later tools SHALL remain usable after the temporary overrides disappear

#### Scenario: Overrides point at a foreign repository

- **GIVEN** a session started in a valid repository
- **WHEN** inherited Git redirection points at another repository during attachment or validation
- **THEN** A1 SHALL use the explicitly selected roots and enforce the original same-repository boundary
- **AND** a rejected switch SHALL preserve the prior association and claims

### Requirement: Explicit detach remains callable when ordinary tool root validation fails

Claim-owning bare A1 sessions SHALL expose a dedicated argument-free worktree_detach tool bound to their current stable session and runtime. It SHALL execute sequentially without invoking ordinary tool cwd resolution or validating Git checkout identity. Recovery SHALL verify the live runtime and serialize association/claim mutation through existing coordination, SHALL clear only the bound session's association and its owner's claims, and SHALL return the original startup directory. The startup directory need not be a Git repository. Failed, cancelled, disposed or stale-session recovery SHALL NOT report successful detach. Comparison sessions SHALL NOT gain this A1-specific recovery tool. Explicit tool selection/exclusion and extension precedence SHALL remain effective.

#### Scenario: Invalid startup identity blocks every ordinary tool

- **GIVEN** a persisted association whose startup Git identity cannot be validated
- **WHEN** the bound session explicitly invokes worktree_detach
- **THEN** recovery SHALL clear that session's association without ordinary cwd validation
- **AND** subsequent ordinary tools SHALL use its original startup directory
- **AND** files, branches, session history and other owners' claims SHALL be preserved

#### Scenario: Ordinary modification encounters uncertain context

- **WHEN** an ordinary modifying tool cannot validate its attached context
- **THEN** its requested operation SHALL remain unexecuted rather than silently falling back to another directory
- **AND** the dedicated detach tool SHALL NOT permit arbitrary commands or target-session selection
