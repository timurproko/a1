## 1. Establish canonical prompt-image data

- [ ] 1.1 Add a shared strict standard-base64 canonicalizer for clipboard image payloads that accepts valid padded or unpadded input, restores exact RFC 4648 padding, decodes and re-encodes without changing bytes, and rejects empty, malformed, URL-safe, whitespace-containing, or wrapped values; verify focused tests cover all three byte-length remainder classes and every rejection category
- [ ] 1.2 Keep MIME type and image bytes stable across canonicalization and make already-canonical input idempotent; verify byte-for-byte decode assertions and unchanged MIME assertions in focused tests

## 2. Normalize every clipboard image ingress

- [ ] 2.1 Update the native system clipboard path to produce canonical padded PNG data, preferring binary clipboard bytes when available while retaining optional-dependency and text fallbacks; verify a deterministic native-adapter fixture reproduces the dependency's no-padding output and receives the canonical result
- [ ] 2.2 Route session-shell injected clipboard images through the same canonicalizer before `PromptChipStore`, and treat invalid image data as unavailable so existing clipboard text is used or the editor remains unchanged; verify focused shell tests cover valid unpadded input, malformed input with text, and malformed input without text
- [ ] 2.3 Ensure prompt chips retain only canonical image attachments and that prompt, steer, and follow-up command paths cannot recover the pre-normalized clipboard string; verify command-capture tests assert canonical data for each applicable submission mode

## 3. Prove the reported provider failure is closed

- [ ] 3.1 Add an end-to-end session-shell regression that pastes an image with omitted required padding, submits its chip, and asserts `PromptOptions.images` contains the required `=` padding, unchanged MIME type, and equivalent decoded bytes while the chip label remains in prompt text
- [ ] 3.2 Add a malformed-image regression proving no image option reaches the agent session and no false successful image chip is shown; verify both text-fallback and no-fallback outcomes
- [ ] 3.3 Run the focused clipboard, prompt-chip, session-shell, owned-command, and Pi session-integration tests plus typechecking in CI; verify the implementation pull request reports all required checks passing

## 4. Deliver and accept separately

- [ ] 4.1 After this specification merges and implementation is explicitly requested, create a fresh detached implementation worktree from current `origin/develop`, use a dedicated `fix/normalize-clipboard-image-base64` branch target, and verify its pull request cites this accepted OpenSpec change without mixing specification history
- [ ] 4.2 Leave the implementation pull request open with auto-merge disabled and provide exact candidate build/run instructions; verify a user can paste and send a Windows screenshot to the previously failing strict OpenAI-compatible model without an `invalid base64-encoded value` error
- [ ] 4.3 Merge only after the maintainer reports physical-terminal acceptance and explicitly authorizes integration, then record acceptance and archive this change in a separate OpenSpec-only follow-up
