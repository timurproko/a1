## 1. Establish the status-level gradient

- [ ] 1.1 Add focused theme tests for the canonical six-level scale, exact semantic dim/accent endpoints, evenly positioned intermediate derivation, exhaustive level handling, and deterministic truecolor/256-color conversion.
- [ ] 1.2 Implement one owned theme presentation helper that derives status-level foregrounds from the current semantic dim and accent colors without changing Pi's editor-border mapping or introducing literal palette values.

## 2. Apply the gradient to the footer

- [ ] 2.1 Add footer coverage for every level, adjacent dim model/provider/separator cells, model subset stability, narrow truncation, no-model/hidden-level behavior, routed-model details, and pinned-profile isolation.
- [ ] 2.2 Route only the primary bare-A1 status-bar level-name span through the gradient helper so session/model/restoration updates retain their existing authoritative data flow.
- [ ] 2.3 After `customize-ui-accent` is present on `develop`, verify all selectable accents and live accent replacement, proving `xhigh` matches each active accent one-to-one while `off` remains semantic grey.

## 3. Validate the separate delivery

- [ ] 3.1 Run focused component/theme tests in truecolor and 256-color modes, typecheck, build, architecture/documentation checks, strict OpenSpec validation, and diff hygiene; record any unresolved gap without weakening endpoint or isolation assertions.
- [ ] 3.2 Build and physically inspect bare A1 through the repository launcher, confirming the lowest-to-highest footer progression, exact highest-level accent match, neutral surrounding cells, live accent repaint, and unchanged `a1 pi` presentation.
