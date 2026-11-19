## 1. Clip the description row

- [x] 1.1 Replace `TruncatedText` with an owned `ClippedLine` component in `skills-dialog.ts` that clips at the render width with no ellipsis.
- [x] 1.2 Update the long-description component test to expect a plain cut; refresh `config/startup-graph-baseline.json`; run the skills dialog suite, typecheck, and `check:architecture`.
