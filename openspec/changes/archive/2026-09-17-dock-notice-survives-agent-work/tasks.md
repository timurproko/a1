## 1. Dismissal and padding

- [x] 1.1 In `#mountTranscript`, dismiss the dock notice only for `user` and `bash` blocks, and render the notice with `PINNED_PI_LAYOUT.outputPad`; verify the notice text starts one cell in.
- [x] 1.2 Extend the bare-A1 notice fixture: a notice raised while streaming survives a text update, a further assistant block, a tool-call block, and the run settling, and is removed by the next submitted user prompt; keep the error, reset, and pinned-route assertions.
- [x] 1.3 Raise the startup graph byte baseline to the new exact size and run the session-shell suite, typechecking, and the architecture and code-documentation checks; record outcomes: `npm run typecheck` clean, `npx vitest run test/integrations/pi/session-ui/session-shell.test.ts` 299 passed, architecture and code-documentation checks OK.
