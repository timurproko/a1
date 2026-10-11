## 1. Establish prompt-copy feedback coverage

- [ ] 1.1 Add a bare-A1 shell regression that keyboard-selects prompt text, presses `Ctrl+C`, verifies the exact clipboard payload, and observes one existing prompt-adjacent `copied N chars to clipboard` acknowledgement after successful delivery.
- [ ] 1.2 Cover failure and out-of-order prompt/frame completion so no failed or stale success acknowledgement is rendered.

## 2. Distinguish and acknowledge prompt copy

- [ ] 2.1 Carry a copy-versus-cut discriminator from the prompt selection interceptor through the owned editor callback without changing selected text expansion, selection collapse, cut deletion, or comparison behavior.
- [ ] 2.2 Submit prompt text through the existing bounded coordinator, share newest-intent fencing with frame copies, and show the existing acknowledgement only for successful `Ctrl+C` copy completion using the exact submitted text length.

## 3. Preserve neighboring routes and validate

- [ ] 3.1 Verify cut and `/copy` keep their established behavior, comparison profiles remain isolated, and failures retain the existing recoverable presentation.
- [ ] 3.2 Run focused prompt UX and session-shell selection tests, typecheck, build, architecture and changed-documentation checks, strict OpenSpec validation, and record implementation evidence with any known gap.
