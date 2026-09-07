## ADDED Requirements

### Requirement: Post-activation warmup targets the exact interactive startup artifact
When update performs post-activation warmup, it SHALL load the same immutable startup artifact, public dependency surfaces, and compile-cache namespace that the next interactive launch will use. Warmup SHALL fail safely when those identities differ and SHALL retain its existing terminal-free, session-free, trust-free, extension-free, and network-free behavior.

#### Scenario: Optimized release is activated
- **WHEN** update activates a release whose interactive path uses narrowed modules or a generated startup artifact
- **THEN** warmup SHALL load that exact artifact and its immutable dependency identities before reporting update success

#### Scenario: Warmup and launch identities differ
- **WHEN** the warmup entry, generated startup artifact, dependency bindings, or compile-cache namespace does not match the activated interactive path
- **THEN** update SHALL reject the candidate or use safe rollback handling rather than report a warmed successful release

#### Scenario: Optional feature is excluded from eager startup
- **WHEN** an optional feature is intentionally deferred beyond first input-ready render
- **THEN** warmup SHALL NOT load or execute that feature merely to populate a broader cache
