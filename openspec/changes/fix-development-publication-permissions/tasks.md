## 1. Permission contract

- [ ] 1.1 Raise the trusted development publication wrapper's `contents` permission ceiling so GitHub can instantiate every declared reusable-publisher job; preserve the called workflow's existing top-level read permissions, per-job overrides, mode conditions, and OIDC publication boundary.

## 2. Regression coverage

- [ ] 2.1 Extend focused release workflow policy tests to require every repository wrapper that calls `publish.yml` to grant the reusable publisher's declared permission ceiling, including `develop.yml`.
- [ ] 2.2 Verify the focused workflow-policy suite, strict OpenSpec validation, and workflow YAML parsing; record the implementation evidence and any live-validation gap in `design.md`.

## 3. Live confirmation

- [ ] 3.1 After integration, rerun `npm run develop` against the then-current authoritative `develop` head and confirm GitHub creates publication jobs instead of returning `startup_failure`; publication itself remains governed by the existing validation and npm checks.
