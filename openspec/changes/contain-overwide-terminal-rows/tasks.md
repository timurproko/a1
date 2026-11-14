## 1. Contain over-width component rows at the Pi TUI boundary instead of ending the session

- [ ] 1.1 Clip an over-width row to the available width with the renderer's truncation in `ComponentBridge.render`, returning fitting rows unchanged and never throwing for width.
- [ ] 1.2 Keep clipped rows terminal-safe: complete graphemes, closed styles and hyperlinks, Kitty image payloads preserved with surrounding ordinary cells bounded, and an unconditional plain-text fallback.
- [ ] 1.3 Expose a contained-row count on the runtime and replace the throw assertions in `test/integrations/pi/tui-runtime/adapter.test.ts` with containment cases for root, mounted, and overlay components.
- [ ] 1.4 Add a regression that renders the crash-triggering characters (lone regional indicator, under-measured wide symbol, spacing combining mark) through shared geometry and the adapter at a tight width without a fatal error.
