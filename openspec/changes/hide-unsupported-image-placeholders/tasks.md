## 1. Omit unsupported user-message image fallbacks

- [ ] 1.1 Gate non-tool transcript attachments before adding spacers or Pi `Image` components when image display is enabled and terminal image capability is unavailable.
- [ ] 1.2 Preserve explicit hidden-image and resolvable-capable-terminal unavailable states without changing transcript block identity or attachment retention.

## 2. Omit unsupported tool-result image fallbacks

- [ ] 2.1 Keep ordinary tool-result text while suppressing synthesized image fallback indicators when no image protocol is available.
- [ ] 2.2 Preserve supported inline image components, explicit hidden-image indicators, conversion diagnostics, and empty-content handling.

## 3. Regression coverage

- [ ] 3.1 Cover unsupported, supported, explicitly hidden, unavailable-asset, and width-controlled user transcript image presentation without blank spacer rows.
- [ ] 3.2 Cover mixed-text and image-only tool results across unsupported, supported, hidden, and conversion-failure states.
- [ ] 3.3 Confirm stored/model-facing content, screenshot chips, image references, extension-owned image components, and `a1 pi` remain outside the display-only omission.

## 4. Validation and acceptance

- [ ] 4.1 Run focused component tests, typecheck, strict OpenSpec validation, and diff hygiene.
- [ ] 4.2 Physically verify through `./scripts/dev` that an unsupported terminal shows no attachment fallback row while supported inline images and explicit hidden/failure diagnostics retain their defined behavior.
