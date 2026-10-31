# Tasks

## 1. Map Option characters to bound tab chords

- [ ] 1.1 Add the ABC/US Option-layer table and an admission step that, on macOS only, turns an unmodified or Shift-only mapped character into its `Alt` chord when that chord resolves to a tab action, leaving all other keys unchanged.
- [ ] 1.2 Apply the admission step before the attach client's binding lookup with the platform supplied by the caller.

## 2. Cover the behavior

- [ ] 2.1 Add Rust tests that pin the Option table, dispatch every default tab action from its Option character on macOS without forwarding input to the child, keep unbound Option characters typed, follow user rebinding, and leave non-macOS hosts and real Alt input unchanged.
