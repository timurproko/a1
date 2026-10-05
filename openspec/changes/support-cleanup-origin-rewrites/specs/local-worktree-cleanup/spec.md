## ADDED Requirements

### Requirement: Repository identity is independent of Git transport rewrites
Local cleanup SHALL derive its same-repository GitHub identity from exactly one literal repository-local `remote.origin.url` value in an accepted canonical `github.com` HTTPS or SSH form. Git transport rewriting through `url.*.insteadOf` MAY change the effective URL used by normal operations and SHALL NOT cause an otherwise canonical configured origin to be rejected or change the derived `owner/repository` identity.

Cleanup SHALL continue using the named Git remote for fetch and ref operations so ordinary Git credential routing remains effective. It SHALL NOT trust an arbitrary literal SSH alias, parse SSH configuration, infer repository identity from connectivity, accept another host, or proceed when the repository-local origin value is absent, malformed, or ambiguous.

#### Scenario: Canonical GitHub origin uses an account-specific transport alias
- **WHEN** repository-local configuration stores `git@github.com:owner/repository.git` and an `insteadOf` rule makes Git transport it through an account-specific SSH alias
- **THEN** cleanup SHALL derive `owner/repository` from the canonical configured value
- **AND** normal Git operations SHALL remain free to use the rewritten transport URL

#### Scenario: The literal origin is an SSH alias
- **WHEN** repository-local `remote.origin.url` directly names a host other than `github.com`
- **THEN** cleanup SHALL report `unsupported-origin` even if external SSH configuration may route that host to GitHub

#### Scenario: Repository-local origin identity is ambiguous
- **WHEN** the repository-local origin URL is absent, empty, malformed, or has more than one configured value
- **THEN** cleanup SHALL fail closed before evaluating or mutating a candidate
