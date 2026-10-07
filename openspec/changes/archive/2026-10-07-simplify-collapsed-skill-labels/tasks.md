## 1. Collapsed dialog labels

- [x] 1.1 Render each collapsed Skills dialog row from the normalized skill name without adding `skill:`, and verify selected, unselected, filtered, and overflow rows retain their existing styling and layout.
- [x] 1.2 Update focused Skills dialog and shell workflow expectations to assert bare displayed names while verifying Enter still submits the exact `/skill:<name>` prompt.

## 2. Command-boundary safeguards

- [x] 2.1 Verify expanded slash-command results remain labeled `skill:<name>` and `/skills:` tunnel results remain labeled `skills:<name>` in their focused component tests.
- [x] 2.2 Run the focused Skills dialog, skills command/tunnel, and session-shell skills tests plus type checking, strict OpenSpec validation, and `git diff --check`; resolve failures without changing unrelated menu behavior.

## Acceptance evidence

- `npm run build`
- `npx vitest run test/integrations/pi/components/skills-dialog.test.ts test/integrations/pi/components/skills-command-tunnel.test.ts test/app/session-shell/session-shell-skills.test.ts` (32 tests passed)
- `npm run typecheck`
- `npx openspec validate simplify-collapsed-skill-labels --strict`
- `git diff --check`
