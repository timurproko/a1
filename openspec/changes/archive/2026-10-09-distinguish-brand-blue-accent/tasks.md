## 1. Rebrand the blue primary

- [x] 1.1 Replace the dark and light `blue` palette primaries with contrast-adapted colors anchored to A1's `#2638d2` brand hue, leaving all other named primaries and the shared derivation transform unchanged.
- [x] 1.2 Add focused dark/light assertions for brand-hue alignment, saturation, and substantial circular hue separation from cyan.

## 2. Preserve projection behavior

- [x] 2.1 Verify blue still projects the complete semantic accent family and remains distinct from cyan in truecolor and 256-color output.
- [x] 2.2 Verify unrelated theme roles and `a1 pi` comparison behavior remain unchanged.

## 3. Validate the visual result

- [x] 3.1 Run focused theme/component tests, typecheck, strict OpenSpec validation, and build; record evidence and any known gap without weakening existing assertions.
- [x] 3.2 Perform build-first interactive review of the Accent color menu and representative blue-accent surfaces beside cyan and purple in Git Bash.

Validation note: the focused theme suite passed 25 tests across dark/light appearance and truecolor/256-color output, and the accent-boundary governance suite passed 6 tests. Typecheck, build, architecture/provenance checks, and strict OpenSpec validation passed. Build-first interactive review confirmed the new blue is visibly distinct from cyan and fits A1 branding.
