## Behavior

- Complete-frame snapshots trim Unicode whitespace only before the first and after the last non-whitespace character.
- Automatic release copy and retained-selection `Ctrl+C` produce the same normalized payload and normalized acknowledgement count.
- Interior indentation and blank lines remain unchanged, while selected cells and retained highlighting preserve the original visual range.
- Whitespace-only frame selections submit an empty payload through injected and terminal clipboard routes without success feedback.
- Existing exact prompt-copy preparation remains covered and unchanged.

## Automated Evidence

- `npx vitest run test/ui/components/selection-copy.test.ts test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/response-copy-transport.test.ts test/app/session-shell/session-shell-selection.test.ts`: 4 files, 178 tests passed.
- `npm run build`: passed.
- `npx vitest run test/app/session-shell/clipboard-packaged.test.ts`: 1 file, 8 tests passed against emitted clipboard helpers.
- `npm run typecheck`: passed after build.
- `npm run check:code-documentation:changed`: passed.
- `npx openspec validate trim-frame-selection-copy --strict --no-interactive`: passed.
- `git diff --check`: passed.
- `npm run check:architecture`: architecture boundaries and product-identity checks passed; the pinned-source-ledger subcheck hit the pre-existing Windows CRLF raw-byte hash mismatch for `pi-coding-agent:src/core/keybindings`, reproduced unchanged on primary `develop`. The candidate does not modify that source or ledger; clean-checkout CI remains authoritative.

## Manual Handoff

Build, run `./scripts/dev`, select an indented command such as `   npm run develop`, and paste it into the prompt or another terminal. The result should be `npm run develop` with no outer whitespace. Also select multiple lines and verify interior indentation and blank lines remain. Run `./scripts/dev pi` and confirm its comparison-profile selection remains unchanged.
