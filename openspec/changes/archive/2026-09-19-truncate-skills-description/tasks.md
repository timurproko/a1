## 1. Truncate the description row

- [x] 1.1 Replace the description `Text` with `TruncatedText` in `skills-dialog.ts` and note the one-line behavior in the component comment.
- [x] 1.2 Add a component test that renders a long description at a narrow width and asserts a single truncated row followed by the hint footer; refresh `config/startup-graph-baseline.json`; run the skills dialog suite and `check:architecture`.
