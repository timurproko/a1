## 1. Short publication caller names

- [ ] 1.1 Rename the caller jobs in `develop.yml`, `release-candidate.yml`, and `release.yml` to `Develop`, `Candidate`, and `Release`.
- [ ] 1.2 Keep job ids, inputs, secrets, permissions, conditions, and `publish.yml` unchanged.

## 2. Validation evidence

- [ ] 2.1 Add a governance assertion that pins the three short caller names.
- [ ] 2.2 Run the focused repository-governance coverage and strict OpenSpec validation, then record the results and any known gap before finalization.
