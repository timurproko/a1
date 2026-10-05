## 1. Center and lighten the shared separator

- [x] 1.1 Refactor both separator SVGs so each complete `* * *` ornament is one centered text run with explicit equal spaces and independently animated asterisk spans.
- [x] 1.2 Match the separator's font weight to the animated waves footer while preserving its size, light/dark colors, view box, twinkle keyframes, staggered timing, and reduced-motion fallback.

## 2. Focused validation

- [x] 2.1 Add or run focused structural checks proving both SVG variants contain the same centered `* * *` layout and unchanged animation/accessibility rules, differing only in their theme color.
- [x] 2.2 Render the README through the existing GitHub preview and inspect the separator at its actual placement in light, dark, animated, and reduced-motion presentation; record implementation evidence and any known gap before handoff.
