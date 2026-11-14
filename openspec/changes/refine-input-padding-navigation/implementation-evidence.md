## Implementation

- Settings section jumps and Agent transcript prompt/compaction jumps now use Ctrl+Shift+Up/Down. Owned shortcut help describes the new chords; Shift-only and Ctrl-only arrows no longer trigger these jumps. The existing Alt+Home previous-anchor action remains unchanged.
- Terminal normalization handles legacy CSI and enhanced press/repeat reports using the pinned parser's canonical modifier ordering. Release reports are not treated as presses, and additional modifiers do not match the new chords.
- `PromptInput` owns minimum one-cell left/right gutters for marker-free owned inputs. Both the ordinary Agent editor and persistent-history editor render unpadded bodies into its reduced content width; their configured padding is applied once by shared presentation. Marker-bearing dialog fields retain their existing inset policy.
- Full-width editor border hooks retain centered scroll cues and history annotations independently of body gutters. Selection/pointer geometry uses the same shared content rectangle. A cursor cell remains inside the content area rather than consuming the right gutter. Tiny terminal widths reduce unavailable gutters and clip safely.

## Focused local evidence

- Product build passed before validation; final rebuilt product is required for interactive review.
- TypeScript source and bin checks passed after the input changes.
- Navigation-focused checks passed: session viewport controller, mixed compaction navigation, real-shell prompt navigation and input ownership, Settings shortcuts, owned shortcut help, and terminal normalization. The initial enhanced-key test exposed canonical modifier-order spelling, corrected in a separate commit; all 26 runtime adapter tests then passed.
- Final input-focused run: 287 tests passed across `prompt-input`, `line-input`, `prompt-input-ux`, `settings-app`, `editor-autocomplete-placement`, `editor-atomic-segmentation`, `editor-paste-presentation`, `history-editor-shell`, `pinned-editor-input-parity`, and real-shell `session-shell-selection` test files. This includes ordinary/persistent-history gutters, explicit/soft line breaks, empty rows, wide characters, larger configured padding, semantic selection/copy/submission, full-width annotations, autocomplete, and independent comparison-profile behavior.
- Strict OpenSpec validation passed for `refine-input-padding-navigation`.

## Known gaps

None. Physical terminal/manual review was not performed and is not claimed; focused deterministic checks are not a substitute for required exact-head CI or maintainer acceptance. Broad test suites were intentionally left to trusted automation.
