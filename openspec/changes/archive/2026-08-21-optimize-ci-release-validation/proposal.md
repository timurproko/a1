## Why

A1 currently discovers most regressions inside manually dispatched npm publication workflows, where repeated builds and an approximately 150-second clean package-install test make development previews slow and turn release automation into the primary feedback loop. Development needs fast, trustworthy GitHub Actions checks before merge while stable releases still receive complete exact-artifact and supported-platform certification.

## What Changes

- Add automatic GitHub Actions validation for pull requests targeting `develop` and commits integrated into `develop`.
- Introduce deterministic, fail-closed change-impact selection that runs affected feature and integration scopes plus mandatory repository-wide static and smoke gates.
- Separate fast, integration, package, and full-release test tiers; remove duplicate gate execution and unnecessary repeated builds.
- Build each preview or stable candidate once, bind test evidence to its commit, version, and package digest, and publish those exact certified bytes without rebuilding or rerunning the suite in the publisher.
- Run expensive clean package-install and complete regression gates when packaging-sensitive inputs change, on a schedule, on explicit full-validation requests, and for every stable candidate.
- Require full stable certification across Windows, Linux, and macOS before `latest` publication while retaining explicitly uncertified Windows preview semantics for `next`.
- Make stable release automation version-independent and suitable for subsequent SemVer releases.
- Define required GitHub branch status checks for `develop` and stricter release checks for `master`.

## Capabilities

### New Capabilities
- `continuous-integration`: Defines automatic development validation, safe affected-scope selection, required branch checks, immutable candidate artifacts, scheduled regression coverage, and publication promotion.

### Modified Capabilities
- `isolated-regression-testing`: Distinguishes affected development-preview gates from complete stable certification while preserving hermetic execution, exact package evidence, and mandatory contract coverage.

## Impact

- Affects GitHub Actions workflows, repository rulesets/status-check configuration, package scripts, Vitest suite organization, release-gate scripts, artifact evidence, and release documentation.
- Adds deterministic CI selection/configuration scripts and governance tests, but does not change the installed A1 CLI or runtime APIs.
- Changes the release process so publication consumes a previously validated tarball rather than rebuilding source during publication.
