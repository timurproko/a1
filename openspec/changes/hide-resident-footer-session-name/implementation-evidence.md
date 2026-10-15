# Implementation evidence

## Local focused evidence

On Windows Node 24:

- `npx vitest run test/integrations/pi/components/prompt-input-ux.test.ts test/app/session-shell/session-shell-resident-footer.test.ts`: 2 files, 26 tests passed. The footer test proves a resident row keeps the repository path, branch, linked `#540` badge, constrained-width badge reservation, usage/model row, and extension-status row while omitting only ` • footer-test`; the same state without the option still shows the name with and without a pull request. The shell test renames a resident and a direct bare-A1 session through `/name`; both view models report the name, the direct footer ends with ` • footer fixture`, and the resident footer is that row without the suffix.
- With the composition flag forced to `true`, the shell test fails, so it observes the resident wiring rather than the footer default.
- `npm run preflight` passed every gate, including build, `tsgo` typecheck, architecture (pinned Pi source ledger: 131 records), changed code documentation, docs governance, and `openspec validate --all --strict`.
- `npx vitest run test/app/session-shell test/integrations/pi/components test/composition/resident-tabs.test.ts test/repository-governance/pinned-pi-source-ledger.test.ts`: 84 of 90 files passed. Every failure is in clipboard or image paste: `clipboard-acquisition`, `clipboard-packaged`, `cold-clipboard-entries`, `image-worker-package`, `session-shell-paste`, and `editor-text-paste`. The emitted paste helper and image codec worker reject with `ImageAttachmentError` in this worktree. `editor-text-paste` fails the same way on unchanged `develop`. None of these suites renders the footer.

## Review

- The session name stays in `status.footer.sessionName`; tab-bridge naming, automatic naming, rename, and program status read the view model unchanged.
- Suppression keys only on the installed `engine.residentTab` collaborator. No environment variable or tab title is consulted. Direct bare A1, `a1 solo`, resident fallback, and `a1 pi` omit that collaborator and keep the default visible suffix.
- The footer port records the new `owned-resident-session-name` deviation in the pinned Pi source ledger; the pinned comparison profile is unchanged.

## Gaps

- The clipboard and image-worker paste failures above come from this local environment and are left to CI validation.
- Manual resident-versus-solo comparison needs the native terminal host, which is not built locally because endpoint protection quarantines its build. To check, launch bare A1 with `./scripts/dev`, name the tab with `/name`, and confirm the chip shows the name and the footer path row does not; then launch `a1 solo` and confirm the footer still ends with the name.
