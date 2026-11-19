# Tasks

## 1. Establish shared dialog-search presentation

- [x] 1.1 Add a render-time semantic `> ` search marker adapter that preserves the existing input instance, focus, IME cursor marker, prompt width, mouse geometry, value, and editing behavior.
- [x] 1.2 Add focused component coverage for exact marker text, accent cell style, live theme resolution, empty and populated queries, and narrow-width clipping.

## 2. Cover every bare-A1 standard searchable dialog

- [x] 2.1 Apply the shared marker to Models, scoped-model configuration, Skills, Thinking Level, Resume Session, and Session Tree without changing filtering, selection, navigation, or cancellation.
- [x] 2.2 Apply the marker through explicit A1 modal adapters to the legacy model selector and login/logout provider selector without inspecting private component state or changing the pinned comparison path.
- [x] 2.3 Add inventory regressions proving each standard searchable dialog renders one accent `> ` marker and preserves its existing query and focus behavior.

## 3. Align the Settings nested selector boundary

- [x] 3.1 Opt the per-model Thinking Level step-one search into the accent `> ` marker through shared input geometry while keeping step two and other structured text entries unchanged.
- [x] 3.2 Preserve the marker-free full-screen Settings search field and add focused regressions distinguishing application search, standard dialog search, and non-search text entry.

## 4. Keep Models catalog refresh in the background

- [x] 4.1 Remove the transient Models `(refreshing)` title presentation and its minimum-visible timer without changing catalog refresh execution, state preservation, or dirty-title behavior.
- [x] 4.2 Keep successful refresh completion silent, retain actionable failure and timeout warnings, and add focused regressions for the quiet progress behavior.

## 5. Unify owned dialog frame geometry and hints

- [x] 5.1 Share one modal-frame geometry primitive across string-based owned panels and component-based Pi frames so rules remain full width and every semantic child receives the same inset and reduced width.
- [x] 5.2 Route the Settings stepped selector's search row through that frame and replace its middle-dot hint separators with canonical whitespace-only spacing while preserving step behavior and clipping.
- [x] 5.3 Add focused wide- and narrow-width regressions for aligned title, description, search marker, rows, and hints.

## 6. Complete focused evidence

- [x] 6.1 Run source typechecking, focused dialog/input/Settings tests, and strict OpenSpec validation; record exact evidence and any reviewed known-gap disposition.
- [x] 6.2 Review the final diff for literal colors, cached themed strings, rendered-row heuristics, private Pi access, geometry drift, omitted searchable dialogs, and `a1 pi` comparison changes.

## Evidence

- `npm run build` and `npm run typecheck` passed.
- Focused dialog, input, selector, and Settings suites passed (224 tests).
- `npm run test:fast` passed 4,919 tests; its sole failure was the architecture policy test's five-second concurrent-run timeout, and the same 39-test file passed in isolation immediately afterward.
- `npx --no-install openspec validate standardize-dialog-search-chevrons --strict` passed.
- Refinement coverage passed 108 focused Models, shared-dialog, Settings, modal-frame, and inventory tests.
- Startup graph, pinned Pi source ledger, and pinned Pi public API governance passed 25 tests after the shared frame import change.
- `npm run build`, `npm run typecheck`, and `git diff --check` passed for the refinement.
