## 1. Declare the preference

- [x] 1.1 Add the live profile-local `accentColor` declaration in a new Appearance section, advance the settings version, and preserve existing and unknown values through migration.
- [x] 1.2 Cover purple-default/invalid resolution, persistence, section placement, allowed choices, undo, and the absence of Pi-settings writes.
- [x] 1.3 Move `Quit animation` from Generic to Appearance after `Accent color`, leaving Generic first with only `Update check`.

## 2. Project one semantic accent

- [x] 2.1 Extend the central named-color projection across semantic accent, a quieter dialog border, and low-prominence selected-row and visible user-prompt backgrounds while preserving every other role.
- [x] 2.2 Reapply the projection after named, watched, and in-memory base-theme replacement without mutating theme resources, matching literal colors, or accumulating transformations.
- [x] 2.3 Route owned select-list and extension theme access through the active facade and add governance against package-global accent bypasses.
- [x] 2.4 Project Markdown list markers onto the exact accent while keeping resting sticky prompts and jump-to-bottom controls neutral until their accent hover.
- [x] 2.5 Replace the inheritance option with explicit purple and increase the darker same-hue separation between titles and border bars for every choice.

## 3. Apply the setting live

- [x] 3.1 Initialize the preference before bare-A1 shell presentation, subscribe to owned settings changes, and keep settings-free and `a1 pi` compositions on unmodified Pi behavior.
- [x] 3.2 Invalidate theme-sensitive caches and force a complete active-frame repaint when the accent changes; release subscriptions on disposal.
- [x] 3.3 Cover live settings-screen and shell-frame changes, truecolor and 256-color output, accent-family projection, all-other-role preservation, extension access, persistence across launch, and comparison isolation.
- [x] 3.4 Show effective-color squares in the accent value menu and keep its current-value checkmark on standard text color.

## 4. Validate upstream resilience

- [x] 4.1 Preserve exact pinned Pi parity for unrelated roles and comparison mode, and add changed-base fixtures proving selected-choice stability.
- [x] 4.2 Run focused tests, typecheck, architecture checks, build, strict OpenSpec validation, and interactive build-first review; record evidence and any known gap without weakening assertions.

Validation note: the complete test command reached 4,305 passing tests and only two unrelated five-second timeout failures under parallel load; both timed-out files passed immediately in isolated reruns. Build, typecheck, architecture checks, strict OpenSpec validation, and a PTY smoke showing six swatches, Appearance ordering, and persisted live blue selection passed. The final list-marker and hover refinement passed 423 component/shell tests, including truecolor/256-color projection and neutral resting-state coverage. The explicit-purple and darker-border refinement passed 539 focused component, settings, composition, and governance tests.
