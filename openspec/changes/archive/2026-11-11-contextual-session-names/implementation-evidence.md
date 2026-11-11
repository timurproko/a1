## Delivered behavior

- Naming uses the current prompt, verified directory/branch hints, and at most six recent plain user/assistant blocks (1,000 characters each), selected by current-task keywords. The current prompt is limited to 2,000 characters and repository hints to 300 characters. Transcript selection stops before the current prompt and excludes tool results, thinking blocks, images, and pasted-image paths.
- Approval-only prompts can use relevant task discussion or a concrete current branch subject. Context regeneration excludes unanchored old discussion. Generic model labels such as `Implement task` and attachment-path results are rejected before contextual deterministic fallback.
- Every generated/fallback name uses at most three words and 32 characters, preserving whole words where possible and readable technical casing. Existing non-blocking budgets, deadlines, cancellation, manual-name ownership, binding/context apply guards, and live-format behavior remain intact.
- Sentence case is first/default for missing or invalid settings and composition fallback. Valid saved Kebab case and Title Case preferences are preserved. Changing format does not rewrite existing names.
- Footer allocation reserves the name beside model/thinking text and reduces detailed statistics first. Optional provider/route text can be omitted; unavoidable name truncation has no dangling separators, overlap, or wrapping. Comparison-profile layout and authoritative name/reveal separation remain unchanged. The copied-source provenance header and ledger hash describe this intentional owned deviation.

## Focused validation

- `npm run build`: passed.
- `npm run typecheck`: passed, including the launcher typecheck against built declarations.
- `npx vitest run test/features/session-naming/session-naming.test.ts test/ui/settings/declarations.test.ts test/ui/settings/sections.test.ts test/ui/settings/manager.test.ts test/features/owned-ui/settings-app.test.ts test/composition/session-runtime-wiring.test.ts test/integrations/pi/components/prompt-input-ux.test.ts`: passed, 224 tests in seven files.
- `node scripts/governance/check-pinned-pi-source-ledger.mjs`: passed, 132 records and 29 behaviors.
- `npx openspec validate contextual-session-names --strict`: passed.
- `git diff --check`: passed.

The isolated worktree required its pinned dependency installation and a build before launcher typechecking; initial checks against inherited older dependencies or absent generated declarations were not treated as product failures. Naming tests assert bounded context, normalization/fallback, and lifecycle behavior with deterministic completions. No live provider or interactive terminal acceptance was claimed.

## CI repair

The first finalized candidate failed architecture checks because the new context helper was eagerly imported and its context type imported the controller, creating a three-module cycle. The context contract now lives in the helper module, the controller imports it only as a type, and both naming helpers load dynamically after an eligible prompt. Prompt identity and transcript are captured before lazy loading. No cycle allowlist or startup budget was relaxed. The startup regression explicitly excludes the context helper from eager reachability.

Finalized-delivery validation also found the missing required `.openspec.yaml`. The archive now retains its spec-driven schema and original creation date; trusted refinalization recalculates the acceptance manifest rather than bypassing validation.

Repair validation passed: build, typecheck, the complete architecture check chain, 61 focused naming/composition/startup tests in three files, and delivery refinalization inspection (including strict change validation). Existing task-name, format, and footer behavior is unchanged by this repair.

## Known gaps

No known gaps. Live naming quality remains model-dependent; interactive approval and resize checks are optional maintainer acceptance, not prerequisites for completing the implementation.
