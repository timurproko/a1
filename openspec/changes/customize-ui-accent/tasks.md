## 1. Declare the preference

- [ ] 1.1 Add the live profile-local `accentColor` declaration in a new Appearance section, advance the settings version, and preserve existing and unknown values through migration.
- [ ] 1.2 Cover default/invalid resolution, persistence, section placement, allowed choices, undo, and the absence of Pi-settings writes.

## 2. Project one semantic accent

- [ ] 2.1 Add a central base-theme projection for `default`, `blue`, `cyan`, `green`, `orange`, and `pink` that overrides only semantic accent rendering and color introspection.
- [ ] 2.2 Reapply the projection after named, watched, and in-memory base-theme replacement without mutating theme resources, matching literal colors, or accumulating transformations.
- [ ] 2.3 Route owned select-list and extension theme access through the active facade and add governance against package-global accent bypasses.

## 3. Apply the setting live

- [ ] 3.1 Initialize the preference before bare-A1 shell presentation, subscribe to owned settings changes, and keep settings-free and `a1 pi` compositions on unmodified Pi behavior.
- [ ] 3.2 Invalidate theme-sensitive caches and force a complete active-frame repaint when the accent changes; release subscriptions on disposal.
- [ ] 3.3 Cover live settings-screen and shell-frame changes, truecolor and 256-color output, non-accent preservation, extension access, persistence across launch, and comparison isolation.

## 4. Validate upstream resilience

- [ ] 4.1 Preserve exact pinned Pi parity under `default` and add a synthetic changed-upstream-accent fixture proving inheritance and named-choice stability.
- [ ] 4.2 Run focused tests, typecheck, architecture checks, build, strict OpenSpec validation, and interactive build-first review; record evidence and any known gap without weakening assertions.
