# Tasks

## 1. Establish shared dialog-search presentation

- [ ] 1.1 Add a render-time semantic `> ` search marker adapter that preserves the existing input instance, focus, IME cursor marker, prompt width, mouse geometry, value, and editing behavior.
- [ ] 1.2 Add focused component coverage for exact marker text, accent cell style, live theme resolution, empty and populated queries, and narrow-width clipping.

## 2. Cover every bare-A1 standard searchable dialog

- [ ] 2.1 Apply the shared marker to Models, scoped-model configuration, Skills, Thinking Level, Resume Session, and Session Tree without changing filtering, selection, navigation, or cancellation.
- [ ] 2.2 Apply the marker through explicit A1 modal adapters to the legacy model selector and login/logout provider selector without inspecting private component state or changing the pinned comparison path.
- [ ] 2.3 Add inventory regressions proving each standard searchable dialog renders one accent `> ` marker and preserves its existing query and focus behavior.

## 3. Align the Settings nested selector boundary

- [ ] 3.1 Opt the per-model Thinking Level step-one search into the accent `> ` marker through shared input geometry while keeping step two and other structured text entries unchanged.
- [ ] 3.2 Preserve the marker-free full-screen Settings search field and add focused regressions distinguishing application search, standard dialog search, and non-search text entry.

## 4. Complete focused evidence

- [ ] 4.1 Run source typechecking, focused dialog/input/Settings tests, and strict OpenSpec validation; record exact evidence and any reviewed known-gap disposition.
- [ ] 4.2 Review the final diff for literal colors, cached themed strings, rendered-row heuristics, private Pi access, geometry drift, omitted searchable dialogs, and `a1 pi` comparison changes.
