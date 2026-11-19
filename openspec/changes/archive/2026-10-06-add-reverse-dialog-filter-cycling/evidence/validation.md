# Implementation Evidence

## Delivered behavior

- Models, Resume Session, and Session Tree recognize the shared terminal decoder's three supported reverse-Tab encodings before forwarding input to their search controls.
- Models and Resume Session reuse their existing two-state transitions; Session Tree reuses its existing backward ordered cycle and wraps from `all` to `labeled`.
- Existing query, selection restoration, asynchronous scope loading, and tree filter application paths remain authoritative rather than being duplicated for reverse input.
- Modal footers remain unchanged and forward-only: `Tab filter` and `Tab scope` are still the only advertised filter-cycle hints.
- Ordinary bare-A1 prompt input retains its existing inert Shift+Tab behavior.
- Copied Pi source provenance and the exact 159-file startup graph baseline were regenerated for the reviewed adaptations; the source-byte total increased from 1,547,798 to 1,547,831 with no file-count or Pi-artifact increase.

## Validation

- `npx vitest run test/integrations/pi/components/models-dialog.test.ts test/integrations/pi/components/session-selector.test.ts test/integrations/pi/components/tree-selector.test.ts test/integrations/pi/components/prompt-input-ux.test.ts` — 4 files and 48 tests passed.
- `npm run build` — passed.
- `npm run typecheck` — passed after the required build generated the clean worktree's `dist/` declarations. The initial pre-build invocation failed only because those generated declarations were absent.
- `npm run check:architecture` — architecture, product identity, package identity, pinned Pi source-ledger provenance, and terminal-host provenance passed.
- `npm run check:customization-ready` — passed with zero architecture debt.
- `npm run check:code-documentation` — passed with no violations.
- `node scripts/pi/update-pinned-pi-source-ledger.mjs --check` and `node scripts/pi/update-startup-graph-baseline.mjs --check` — both generated baselines are current.
- `npm exec -- openspec validate add-reverse-dialog-filter-cycling --type change --strict --no-interactive` — passed.
- `git diff --check` — passed.

## Gap disposition

No known implementation or environment gaps remain. Physical terminal review is available through the built bare-A1 development launcher and should exercise `/models`, `/resume`, and `/tree` with Tab and Shift+Tab while confirming the hint rows remain unchanged.
