# Implementation evidence

## Pre-implementation observations

- OIDC development publication [36338434391](https://github.com/timurproko/a1/actions/runs/36338434391) completed successfully for `0.2.1-dev.603`: both package publications, exact registry verification, Windows/Linux/macOS published-pair installation, completion, and aggregate passed. The presentation report is therefore not a publication failure.
- The supplied Windows Terminal capture of `npx -y @timurproko/a1-install@next --version 0.2.1-dev.603` showed the interactive row as `53% Installingpackages`. The renderer wrote shorter phase wording over a longer prior phase without erasing the remaining suffix.
- npm serves `.603` for both packages under `next`. The npm profile package list displays each package's `latest` tag rather than its newest publication, explaining why it still showed `@timurproko/a1@0.2.0` and the installer bootstrap `.599`.
- The root README and `a1 update` already establish bare update for release and `--develop [preview-or-version]` for develop/preview selection. The installer alone used `--version` for an exact preview.

## Implementation results

The interactive installer now renders only the existing colored 40-cell bar and numeric percentage. Every TTY frame appends erase-to-end-of-line, so text from an earlier longer frame cannot survive. Internal npm/activation phase classification and progress milestones remain unchanged; redirected output still contains only the exact success line.

Fresh installation now matches self-update exactly:

- bare invocation selects the release;
- `--develop` selects develop;
- `--develop 107` selects the unique published preview numbered 107;
- `--develop 0.1.8-dev.107` selects that exact published preview.

Numeric previews are resolved from npm's authoritative application version list and fail when absent or ambiguous. Existing installations receive the resolved full version through `a1 update --develop <full-version>`. `--version`, `--latest`, and `--next` are rejected as unsupported options; no compatibility aliases remain. Root/package READMEs, installer help, package validation, the release runbook, and public update-help wording use release, develop, and preview consistently while identifying npm `latest`/`next` only as registry tags.

Validation on the implementation worktree:

- `npm ci` — passed; lifecycle build completed. npm reported two moderate dependency audit advisories and the environment check noted that `gh` is not on `PATH`; neither changes candidate behavior.
- `npx vitest run test/foundation/release/installer-bootstrap.test.ts test/cli/update-cli.test.ts test/cli/dispatch.test.ts test/cli/package-message-parity.test.ts` — passed, 162 tests with two Unix-only installer tests skipped on Windows.
- `node scripts/release/prepare-installer-package.mjs` followed by `node scripts/release/validate-installer-package.mjs .artifacts/validation/package/installer.tgz` — passed, including packaged help and removed-option rejection.
- `npm run typecheck` — passed.
- `npm run check:code-documentation:changed` — passed with no violations.
- `node D:/Git/a1/node_modules/@fission-ai/openspec/bin/openspec.js validate simplify-installer-interface --strict` — passed.
- `git diff --check` — passed.

The Windows checkout's CRLF executable source was normalized to repository LF bytes before Vitest to avoid the local Vite shebang parser issue; this changes no Git content. Per repository policy, no local full or release suite was run. Current `origin/develop` remained `affa36fec791ebe866fe71f201deb474687a95f7`, so no reconciliation merge was needed.

## Known gaps

- Windows cannot execute the two Unix symlink tests locally; exact-head CI must retain their Linux/macOS evidence.
- The corrected interface is not present in immutable `.603`. After merge, one newly numbered OIDC development publication must pass registry verification, all native published-pair lanes, completion, and aggregate before the new commands and percentage-only presentation are available under npm `next`.
- npm's profile package list will continue showing `latest` headline versions until a deliberate release publication moves that registry tag; this change does not alter dist-tag policy.
