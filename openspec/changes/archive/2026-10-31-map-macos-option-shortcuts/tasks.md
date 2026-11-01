# Tasks

## 1. Map Option characters to bound tab chords

- [x] 1.1 Add the ABC/US Option-layer table and an admission step that, on macOS only, turns an unmodified or Shift-only mapped character into its `Alt` chord when that chord resolves to a tab action, leaving all other keys unchanged.
- [x] 1.2 Apply the admission step before the attach client's binding lookup with the platform supplied by the caller.

## 2. Cover the behavior

- [x] 2.1 Add Rust tests that pin the Option table, dispatch every default tab action from its Option character on macOS without forwarding input to the child, keep unbound Option characters typed, follow user rebinding, and leave non-macOS hosts and real Alt input unchanged.

## 3. Name Alt Option on macOS everywhere

- [x] 3.1 Name Alt `Option` on macOS in the attach client's tab, palette, `+` menu, and footer hint labels, the shared TypeScript shortcut label formatter, and the resident changelog refusal message, keeping `Alt` elsewhere.
- [x] 3.2 Make the failed-tab banner name the effective close shortcut and omit it when unbound.
- [x] 3.3 Cover macOS and non-macOS labels in Rust and TypeScript tests, pinning existing label tests to an explicit platform, and record the startup source-byte baseline for the additions.
