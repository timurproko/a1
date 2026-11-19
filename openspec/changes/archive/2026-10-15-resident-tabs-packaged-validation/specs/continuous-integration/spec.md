## ADDED Requirements

### Requirement: Validation candidates carry the lane's release terminal host
Every pull-request validation lane whose selected scopes consume a packed candidate, and every Full regression job that packs one, SHALL build the release terminal host for its own platform into `dist/native` after installation and before recording the build receipt. On CI, validation packing SHALL fail before `npm pack` when the candidate lacks the platform's verified process guardian or terminal host, naming each problem.

#### Scenario: A pull request changes resident launch routing
- **WHEN** pull-request validation runs packaged suites for the change
- **THEN** the packed candidate SHALL carry the release terminal host, and packaged launches SHALL take the route a published package takes

#### Scenario: A lane packs without the host
- **WHEN** a CI lane reaches validation packing without this platform's terminal host
- **THEN** packing SHALL fail before `npm pack` and SHALL name the missing artifact
