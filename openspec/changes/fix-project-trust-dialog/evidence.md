# Implementation evidence

## Result

- An uncovered working directory under `defaultProjectTrust: ask` now requires an explicit decision even when no project-scoped resource is currently discoverable; resource absence no longer grants implicit trust.
- Exact saved decisions remain folder-scoped, unrelated siblings remain undecided, and explicitly saved ancestor decisions continue to cover descendants with exact child overrides.
- Bare A1 renders project trust as a vertically compact dialog at the bottom of the startup surface, with full-terminal-width blue rules, the exact product-neutral `This allows to load…` explanation, compact short-terminal fallback, ANSI-safe working-directory text, unchanged navigation/accept/cancel behavior, and exactly-once restoration.
- `a1 pi` retains the former top-left comparison presentation; the launch entry selects the presentation explicitly by profile.
- The bare renderer is loaded through a narrow startup-safe dynamic boundary, keeping the eager startup graph within its existing 157-file / 1,513,661-byte budget at 1,513,644 bytes.
- The pinned public-API consumer inventory no longer lists the removed `hasTrustRequiringProjectResources` preflight import; the export remains available through the startup-public boundary.

## Local validation

- `npx tsc -p tsconfig.build.json` followed by `node scripts/pi/build-startup-public.mjs` — emitted the TypeScript/runtime startup artifacts used by the development launcher.
- `npm run typecheck` — passed for source and bin projects.
- `npx vitest run test/features/owned-ui/project-trust-prompt.test.ts test/integrations/pi/engine/project-trust-preflight.test.ts test/repository-governance/pi-modal-surface-inventory.test.ts test/foundation/release/warmup.test.ts test/repository-governance/startup-descriptor.test.ts` — 5 files and 28 tests passed, including exact product-neutral wording, full-width border length, and fixed blue ANSI coverage.
- `node scripts/governance/check-architecture.mjs` — passed at 157 files / 1,513,644 startup source bytes.
- `npx openspec validate fix-project-trust-dialog --strict` — passed.
- `npx vitest run test/repository-governance/pinned-pi-public-api.test.ts` — 5 tests passed after refreshing the exact consumer inventory.
- `npx vitest run test/ui/components/selection-scrollbar-edge.test.ts --testTimeout=30000` — 11 tests passed; the unrelated CI timeout did not reproduce locally.
- `./scripts/dev --print-environment` — passed through the built development launch path and selected the bare-A1 profile.
- `git diff --check` — passed.

## Local environment limitations

- `npm run build` stopped in its prerequisite check before compilation because this shell has no `gh`, `cargo`, or `rustc` executable on `PATH`. The affected native process guardian is unchanged; TypeScript build/typecheck and focused runtime tests passed, while exact-head CI retains authority for the complete build.
- The aggregate `npm run check:architecture` passed architecture and product-identity checks, then stopped in the existing pinned-source ledger check because the Windows CRLF working copy hash for the unchanged keybindings port differs from its LF-normalized ledger hash. The directly affected architecture check passed and no ledger or keybindings file changed.

## Manual handoff

Build with `npm run build`, create an isolated profile and two unrelated empty folders, then launch the exact checkout through `./scripts/dev` from the first folder. Confirm the trust dialog is anchored at the bottom with blue top and bottom rules spanning every terminal column, arrows/Tab move the selected row, Enter persists the choice, and Escape/Ctrl+C restores the parent terminal. Relaunch from the same folder to confirm it does not ask again, launch from the unrelated folder to confirm it does ask, then launch from a child of an explicitly trusted folder to confirm the saved ancestor decision is inherited.

## Known gaps

None. Physical Windows Terminal confirmation of the full-width blue rules, bottom placement, and parent restoration is the prepared maintainer handoff; deterministic path policy, geometry, color bytes, input, control-byte safety, profile selection, and restoration behavior are covered locally.
