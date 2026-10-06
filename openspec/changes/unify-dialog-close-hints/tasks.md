## 1. Shared close guidance

- [x] 1.1 Add one framework-neutral semantic `Esc close` entry and close-suffix layout support, and verify component tests cover exact key/action styling, final placement, deduplication, ordinary widths, and ANSI-safe narrow output.
- [x] 1.2 Route owned Settings and reference-screen shortcut declarations plus the startup-safe trust prompt through the canonical wording, and verify full-screen, nested Settings, and pre-resource fixtures render exactly one final `Esc close` without loading forbidden startup resources.

## 2. Dialog families

- [x] 2.1 Update Models, Thinking, Skills, trust, scoped-model, generic selector, and extension input/editor producers to consume the shared close entry, and verify top-level and nested component tests retain selection, submission, save, and parent-restoration outcomes.
- [x] 2.2 Add the canonical close suffix to Session Tree and Resume Session ordinary and state-specific guidance, and verify empty/search/loading, label/rename, confirmation, transient-status, wrapped, and clipped frames keep `Esc close` complete while existing controls retain order.
- [x] 2.3 Give authentication and cancellable operation surfaces owned canonical close guidance without patching installed dependencies, update pinned-source ledger records when a local source port is required, and verify login states and `/share` progress keep their existing cancellation, abort, result, focus, and disposal behavior.

## 3. Completeness and integration

- [x] 3.1 Extend modal-inventory and owned-route coverage to reject missing, duplicated, non-final, or variant dismissal text on every A1-rendered dismissible node while preserving documented extension-owned and `a1 pi` exclusions.
- [x] 3.2 Update shell workflow and terminal-frame tests for Settings, Models, Thinking, Skills, Tree, Resume, trust, authentication, generic confirmations, extension-hosted dialogs, and operation progress; verify exact `Esc close` presentation and unchanged Escape/implicit-alias dispatch.
- [x] 3.3 Run type checking, architecture checks, and the focused component, owned-UI, shell-workflow, modal-inventory, and comparison-profile suites; record evidence and resolve all failures without running prohibited local fast/full/release suites.

## Acceptance evidence

- `npm run typecheck`
- `npm run check:architecture`
- 21 focused component, owned-UI, shell-workflow, and governance files: 272 tests passed
- 4 focused launch/comparison-profile files: 39 tests passed
- `npx openspec validate unify-dialog-close-hints --strict`
- `git diff --check`
