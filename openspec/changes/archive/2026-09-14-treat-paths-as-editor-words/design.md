## Context

See `proposal.md` for motivation. Bare A1 constructs the public Pi TUI `Editor` through `OwnedEditor` and places `PromptSelectionInterceptor` in front of it. The interceptor already wraps Pi's internal segmentation method so registered prompt chips are emitted as merged segments. This customization is installed only for the bare-A1 keybinding profile; `a1 pi` delegates directly to pinned Pi.

Pi's word operations call `findWordBackward` or `findWordForward` over `Intl.Segmenter` output. Letter/number runs are word-like while punctuation is not, and Pi additionally preserves ASCII punctuation boundaries. A Windows path is consequently traversed as `D`, `:/`, `Git`, `/`, `a1`, `/.`, `worktrees`, and each hyphen-separated name component. Word deletion first computes the same boundary, which explains the identical chunking.

## Goals / Non-Goals

**Goals:**
- Add path-aware word boundaries without replacing Pi's editor or keybinding dispatch.
- Preserve Pi's native deletion side effects, including undo snapshots, kill-ring accumulation, history exit, change notifications, and autocomplete handling.
- Keep ordinary character operations and existing chip atomics unchanged.
- Recognize path syntax without synchronous filesystem access.

**Non-Goals:**
- Change word behavior in `a1 pi`, third-party extension editors, settings filters, or other single-line fields.
- Make all punctuation-containing strings atomic.
- Validate that a path exists, normalize it, or change its submitted text.
- Treat environment variables, shell substitutions, URLs, or ambiguous bare filenames as filesystem paths in this change.

## Decisions

### Add a pure high-confidence path-range detector

Introduce a private owned-editor helper that returns non-overlapping source ranges for path tokens on one logical line. Recognized prefixes are drive-rooted (`C:/` and `C:\\`), UNC (`\\\\server\\share`), POSIX-rooted (`/`), dot-relative (`./` and `.\\`), parent-relative (`../` and `..\\`), and home-relative (`~/` and `~\\`). Balanced single or double quotes form token boundaries and permit spaces inside the path; unquoted paths end at whitespace.

Recognition is lexical. Filesystem probing was rejected because editor navigation must remain immediate, paths may describe future files, and UNC probing could perform unintended network I/O. Treating every non-whitespace run as one word was rejected because it would change punctuation editing for prose, flags, expressions, and other non-path content.

### Extend the existing segmentation boundary for word mode only

Generalize the existing editor segmentation wrapper so prompt-chip ranges continue to merge in both grapheme and word modes, while path ranges merge only when Pi requests word segmentation. For Pi's prefix/suffix word-navigation calls, map ranges from the complete current logical line into the sliced text before merging. This preserves correct behavior when the caret begins inside a path.

Represent each merged path range to Pi's word-navigation helper as one synthetic word-like segment with the same UTF-16 length and source index as the original range but no visible punctuation in its internal segmentation value. The synthetic segment is used only for boundary calculation; stored and rendered prompt text remains byte-for-byte unchanged.

Directly intercepting Ctrl key sequences was rejected because keybindings are configurable and raw terminal spellings vary. Directly mutating editor text for deletion was rejected because it would duplicate or bypass Pi's undo, kill-ring, history, autocomplete, and notification behavior. Modifying the installed Pi TUI package or its global punctuation table was rejected by the public API boundary and would affect comparison mode and unrelated text.

### Keep path-word behavior in the bare-A1 interceptor

Install the word-range provider alongside the existing prompt selection/chip interceptor, which is created only when `keybindingProfile` is `a1`. Continue delegating the semantic key actions to Pi after segmentation is adapted. No changes are required to keybinding definitions: Ctrl+Arrow already maps to word movement, and bare A1 already adds Ctrl+Backspace/Delete aliases for word deletion.

This placement makes the behavior available to custom key remappings of the same semantic actions and leaves `a1 pi` unchanged.

### Verify boundaries through pure and shell-level tests

Pure tests will cover range detection, quoted spaces, slash directions, cursor-inside slicing, multiple paths, and rejection of ordinary punctuation. Owned editor or session-shell tests will drive semantic key sequences and observe cursor location by insertion, deleted text, undo, yank, normal grapheme operations, chip behavior, and comparison-profile behavior.

## Risks / Trade-offs

- [A syntactically ambiguous token such as `/model` is also a valid rooted path] → Limit recognition to declared path prefixes and document that syntactically valid paths do not require filesystem existence; avoid broad punctuation heuristics.
- [Quoted or adjacent punctuation is consumed incorrectly] → Give balanced quotes explicit token boundaries and cover surrounding prose and multiple-token cases in table-driven tests.
- [The private Pi editor segmentation shape changes in a dependency update] → Keep the adaptation at the existing bounded compatibility wrapper and extend focused Pi component conformance tests so incompatible segment metadata fails visibly.
- [Synthetic segmentation changes displayed text] → Preserve original source text and indices and apply synthetic characters only to the internal word-boundary segment value; assert rendered and submitted text are unchanged.

## Migration Plan

No persisted state or user configuration changes. Ship the bare-A1 segmentation enhancement with its tests. Rollback removes the path-range provider while leaving the existing chip segmentation wrapper and Pi comparison behavior intact.
