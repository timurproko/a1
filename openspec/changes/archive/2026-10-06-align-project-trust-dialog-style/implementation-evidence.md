## Implementation result

- The pre-resource trust selector now mirrors the standard dark dialog's accent, border, muted, and dim roles while retaining its isolated fixed-ANSI renderer.
- Its shortcut row uses the standard concise key/action structure and remains directly adjacent to the bottom rule in preferred geometry.
- The in-session trust selector uses explicit owned-theme border styling, normal-text decision values after muted labels, one-space selection rows, and no checkmarks in its choice menu.
- The in-session shortcut row now sits directly above the bottom rule without an extra blank row.
- The pinned Pi source ledger and bounded startup-graph baseline were regenerated for the reviewed owned-source change.

## Focused evidence

- `npx vitest run test/features/owned-ui/project-trust-prompt.test.ts test/integrations/pi/engine/project-trust-context.test.ts`: 2 files and 30 tests passed.
- `npm run typecheck`: both TypeScript project checks passed.
- `npm run check:architecture`: architecture, product identity, pinned Pi source-ledger provenance, and terminal-host provenance checks passed.
- `npm run build`: the interactive checkout built successfully.
- `npm exec -- openspec validate align-project-trust-dialog-style --strict`: passed.

## CI repair

- Finalized-head run `37488506619` exposed one stale raw-ANSI assertion in `session-shell-workflows.test.ts`: the intended muted-label/normal-value boundary means `Current session: untrusted` is no longer contiguous in the styled byte stream.
- The assertion now evaluates stripped visible text while the dedicated trust-context tests continue to assert the exact semantic ANSI spans. The repaired focused set (`session-shell-workflows`, startup trust prompt, and trust context) passed 3 files and 44 tests.

## Manual refinement

- Physical-terminal review confirmed that the saved-state checkmark duplicated the status summary and made the choice menu resemble a checklist. The menu now uses only its active arrow; an exact saved choice remains initially selected, and focused rendering coverage rejects any checkmark.

## Known gaps

No implementation gap is known. Physical-terminal color and spacing confirmation remains the maintainer's manual acceptance step; the build-first handoff exercises the startup selector before trust and the in-session `/trust` selector without claiming that automated ANSI assertions substitute for visual acceptance.
