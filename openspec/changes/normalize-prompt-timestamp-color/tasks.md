## 1. Normalize timestamp painting

- [x] 1.1 Introduce one Pi submitted-prompt timestamp painter that applies the live selected/hover prompt foreground at normal intensity; verify both natural row composition and pinned-row overlay use that painter without adding a viewport-level timestamp API.
- [x] 1.2 Preserve existing prompt-body dim/hover styling, backgrounds, timestamp layout and omission, and following-row style isolation while applying the stable timestamp painter to user prompts and completed compactions; verify focused rendering fixtures retain their existing text and geometry.

## 2. Prove state-independent terminal styling

- [x] 2.1 Update terminal-cell integration coverage for natural, prominent pinned, hovered pinned, and quiet/dimmed timestamps; verify user-prompt and completed-compaction timestamp glyphs have identical foreground mode, foreground value, and normal intensity while body and background state changes remain intact.
- [x] 2.2 Add source timestamp selection and style-leak coverage; verify selected timestamp cells retain the same foreground/intensity with the selection background visible and a following sentinel row receives no leaked foreground or intensity.

## 3. Validate and hand off

- [x] 3.1 Run the focused submitted-prompt and session-shell tests plus `npm run typecheck`; verify all commands pass without weakening unrelated viewport assertions.
- [ ] 3.2 Build the candidate and hand off the repository checkout through `./scripts/dev` for visual review; verify the timestamp keeps the selected-state color in normal, hover, quiet/dimmed, and text-selected prompt states while the prompt body still changes normally.
