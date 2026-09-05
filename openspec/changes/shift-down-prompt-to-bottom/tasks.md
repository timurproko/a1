## 1. Forward-navigation transition

- [ ] 1.1 Change the no-next-prompt case in `src/ui/components/transcript-viewport.ts` to reuse the bottom transition, retaining the no-anchor guard and existing intermediate destinations; verify a final-prompt jump reaches the bottom with following enabled.
- [ ] 1.2 Update the prompt-navigation unit sequence in `test/ui/components/transcript-viewport.test.ts` to cover earlier prompts, last prompt, bottom, repeated bottom, Shift+Up reversal, and forward return; verify the sequence preserves the first-prompt opening spacer and never wraps.

## 2. Boundary and input regression coverage

- [ ] 2.1 Add viewport cases for a single prompt, a detached position within the final response, zero prompt anchors, a fitting transcript, and a prompt destination clamped to the bottom; verify each outcome matches the delta spec.
- [ ] 2.2 Compare next-prompt navigation with `scrollToEnd` from equivalent detached states with pending messages; verify equal bottom position, following state, cleared message count, and continued following after appended output.
- [ ] 2.3 Extend controller/session input tests under `test/integrations/pi/session-ui/` for the last-prompt-to-bottom transition using all supported Shift+Down encodings; verify consumption, repaint on navigation, unchanged editor draft, and preserved modal/disabled-viewport routing.

## 3. Integrated validation and acceptance

- [ ] 3.1 Verify the implementation pull request's required CI checks pass, including the affected viewport and session tests; record the results and any remaining limitations.
- [ ] 3.2 Obtain user validation in the built bare-A1 UI with a multi-prompt conversation and a response extending below the last prompt; record acceptance that Shift+Down reaches and follows the bottom like End and Shift+Up/Down navigates back and forth without losing intermediate stops.
