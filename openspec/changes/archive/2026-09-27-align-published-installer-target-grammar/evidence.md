# Implementation evidence

## Incident evidence

Development publication [36342374957](https://github.com/timurproko/a1/actions/runs/36342374957) selected merged #604 source `4fbeff681ae2198e04d02a08040530e88a9f48d8` and candidate `0.2.1-dev.604`. Candidate assembly and all Windows, Linux, and macOS exact-package validation lanes passed. The publish job then OIDC-published both packages with provenance and verified the registry served the validated bytes.

The registry still confirms:

- `@timurproko/a1@0.2.1-dev.604`: integrity `sha512-NFnYPdZcaSC3rBc0pzTaw4kFh7jZ1NmDymK3Gzuq9rdrTzDxrX+T3xsDwjlt5be2M1Lowr9UQFSS+SQ5tQXCtA==`, shasum `f2a0704b7822122a2bbde5c4608b8bef0a3fddaa`;
- `@timurproko/a1-install@0.2.1-dev.604`: integrity `sha512-VMD6g7ezIfPZ8RLWMRETGCeAqh6hWHJXvBEQpJs5cMkf+aDRTk0CvIJOz/dLVplXq6YbYMjXbu2MHIRbxUW9nw==`, shasum `45c56b0f45fb64f0c7f454d2a28786402579c013`;
- both internal npm `next` tags name `.604`; application `latest` remains `0.2.0` and installer `latest` remains its bootstrap `0.2.1-dev.599`.

Every post-publication job then failed consistently:

- Darwin job `108687031142`;
- Linux job `108687031221`;
- Windows job `108687031286`.

Each lane acquired the exact `.604` installer, but `smoke-published-installer.mjs` passed `--version 0.2.1-dev.604`. The published installer correctly returned `installation failed: unsupported option`, so no lane wrote its evidence artifact. Completion remained skipped and the publication aggregate failed. This is a release-harness consumer defect, not an OIDC, registry, package-byte, or platform-specific installer failure. `.604` remains immutable and its failed run remains failed.

## Implementation results

The published-installer harness now maps npm's internal `next` channel to the accepted public argument pair `--develop <exact-preview-version>`. Release (`latest`) smoke retains the empty argument list. Exact installed-manifest equality, isolated prefixes, application launch verification, evidence output, process cleanup, native matrices, completion, and aggregate logic are unchanged.

Focused release-policy coverage requires the exact develop mapping and rejects literal removed `--version`, `--latest`, or `--next` target arrays in the harness. This catches interface drift in pull-request validation before publication.

Validation on the implementation worktree:

- `npm ci` — passed and completed the lifecycle build; npm reported two moderate dependency audit advisories and the environment check noted that `gh` was not on `PATH`, neither of which changes candidate behavior.
- `npx vitest run test/repository-governance/release-pipeline-policy.test.ts` — passed, 16 tests.
- Local Windows execution of `smoke-published-installer.mjs` against the exact published `.604` versions and registry integrities — passed on `win32/x64`, wrote evidence, and verified the installed application launcher. This uses the corrected harness with immutable registry bytes without republishing them.
- `npm run typecheck` — passed.
- `npm run check:code-documentation:changed` — passed with no violations.
- Strict OpenSpec validation — passed.
- `git diff --check` — passed.

Current `origin/develop` remained `4fbeff681ae2198e04d02a08040530e88a9f48d8`, so no reconciliation merge was needed.

## Known gaps

- Local focused execution proves the corrected adapter only on Windows. Exact-head PR CI must validate repository policy, and post-merge publication must execute the actual Linux and macOS lanes as well.
- `.604` cannot prove corrected repository tooling because its publication run checks out immutable #604 source. After merge, one newly numbered candidate must pass both OIDC publications, exact registry verification, Windows/Linux/macOS published-pair smoke, completion, and aggregate before recovery is complete.
