## 1. Normalize timestamp painting

- [x] 1.1 Update the shared Pi submitted-prompt timestamp painter to apply the live grey metadata foreground at normal intensity; verify both natural row composition and pinned-row overlay use that painter without adding a viewport-level timestamp API.
- [x] 1.2 Preserve existing prompt-body dim/hover styling, backgrounds, timestamp layout and omission, and following-row style isolation while applying the stable timestamp painter to user prompts and completed compactions; verify focused rendering fixtures retain their existing text and geometry.

## 2. Prove state-independent terminal styling

- [x] 2.1 Update terminal-cell integration coverage for natural, prominent pinned, hovered pinned, and quiet/dimmed timestamps; verify user-prompt and completed-compaction timestamp glyphs retain the grey metadata foreground and normal intensity while body and background state changes remain intact.
- [x] 2.2 Add source timestamp selection and style-leak coverage; verify selected timestamp cells retain the same foreground/intensity with the selection background visible and a following sentinel row receives no leaked foreground or intensity.

## 3. Validate and hand off

- [x] 3.1 Run the focused submitted-prompt and session-shell tests plus `npm run typecheck`; verify all commands pass without weakening unrelated viewport assertions.
- [x] 3.2 Build the candidate and hand off the repository checkout through `./scripts/dev` for visual review; verify the timestamp stays grey in normal, hover, quiet/dimmed, and text-selected prompt states while the prompt body still changes normally.

## 4. Repair exact-head validation

- [x] 4.1 Restore documentation and architecture compliance by using an approved implementation-comment prefix and keeping the transcript presenter within its guarded line budget; verify the documentation and architecture checks pass.
- [x] 4.2 Update the broader session-shell timestamp assertion to expect grey metadata styling and run the complete session-shell test file; verify all prompt, viewport, and unrelated shell scenarios pass.
