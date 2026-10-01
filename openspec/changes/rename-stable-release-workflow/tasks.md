## 1. Stable wrapper identity

- [ ] 1.1 Rename `.github/workflows/finalize-release.yml` to `.github/workflows/release.yml` without changing its trigger, display name, jobs, permissions, rollback, or reopening behavior.
- [ ] 1.2 Update `publish.yml` to authorize the new exact stable caller path while preserving tag, actor, source, version, and native-release checks.

## 2. Governance and compatibility

- [ ] 2.1 Update repository-governance inference and inventory, source comments, and active documentation to identify `release.yml` as the stable wrapper and list the matching npm trusted-publisher migration.
- [ ] 2.2 Update focused workflow, governance, runbook, and npm-trust tests; preserve exact historical `Release`/`release.yml` provenance compatibility and reject mismatched identities.

## 3. Proof

- [ ] 3.1 Verify active-path searches contain no obsolete `finalize-release.yml` reference, every workflow YAML file parses, strict OpenSpec validation passes, and the focused release/governance suites pass.
- [ ] 3.2 Record implementation evidence and the external npm migration boundary in `design.md`.
