## 1. Collapsed dialog labels

- [ ] 1.1 Render each collapsed Skills dialog row from the normalized skill name without adding `skill:`, and verify selected, unselected, filtered, and overflow rows retain their existing styling and layout.
- [ ] 1.2 Update focused Skills dialog and shell workflow expectations to assert bare displayed names while verifying Enter still submits the exact `/skill:<name>` prompt.

## 2. Command-boundary safeguards

- [ ] 2.1 Verify expanded slash-command results remain labeled `skill:<name>` and `/skills:` tunnel results remain labeled `skills:<name>` in their focused component tests.
- [ ] 2.2 Run the focused Skills dialog, skills command/tunnel, and session-shell skills tests plus type checking, strict OpenSpec validation, and `git diff --check`; resolve failures without changing unrelated menu behavior.
