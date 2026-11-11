## Current behavior

`src/features/session-naming/controller.ts` passes only a newly observed user prompt plus the current directory basename and branch to `generate.ts`. The generator sees at most 500 prompt characters, requests a 16-character title, and falls back to the first three prompt words. Consequently an approval such as `ok do it` can become `Implement task` even when the session already discussed spinner settings. Every name is then truncated to 16 characters.

Settings currently default to `kebab`, and the menu puts Kebab case first. The footer currently protects statistics/model content before allocating any remaining width to the name, matching the existing specification but not the requested priority.

## Approved scope proposed for implementation

### Relevant task context

Build a bounded naming input from the current prompt, relevant recent user/assistant task discussion, and verified current repository hints. Keep context selection inside the session-naming owner where possible; use neutral transcript contracts, with a minimal adapter addition only if the existing view cannot supply the necessary plain-text task context. Do not copy images, binary content, tool results, or full unbounded transcripts into naming requests. Treat attachment paths as references rather than task titles.

Resolve approval-only prompts against the concrete task already being discussed, with current worktree/branch hints as supporting evidence. Prefer a specific subject such as `Spinner style settings` or `Session naming improvements`, not `Implement task` or `Ok do it`. Prompt instructions must distinguish conversation data from naming instructions. At context transitions, exclude unrelated historical tasks; old context must not override the new prompt or verified worktree. Do not broaden the naming trigger to every prompt or disturb the existing lifecycle.

Fallback should also use the best available concrete task context instead of blindly echoing approval words or attachment filenames. When no meaningful task exists, retain a neutral fallback rather than fabricate a task. Preserve cancellation and compare-and-apply guards for the exact session, context revision, enabled setting, and manual ownership.

### Short descriptive labels

Prefer two or three words with a hard maximum of three words and 32 characters including spaces or hyphens. Normalize provider output and fallback through one pipeline in all supported formats, preserving acronyms and mixed-case technical names. Apply word-boundary shortening rather than the old 16-character truncation, so `Spinner style settings` remains intact. Keep the two bounded tool-free attempts, deadlines, asynchronous execution, and live-format apply behavior.

### Format default and ordering

Use `sentence` for absent/invalid owned settings and composition fallback. Present Sentence case first, Kebab case second, and Title Case third. Retain valid persisted `kebab` and `title` preferences; do not migrate explicit preferences or rewrite existing automatic/manual names solely because the default changed.

### Footer priorities

For the bare-A1 second footer row, allocate width to the current name and right-aligned model/thinking segment before detailed statistics. Reduce/compact statistics first as the terminal narrows; only clip the name after expendable statistics have been reduced. Avoid dangling separators, wrapping, model overlap, and additional footer rows. Keep the full authoritative name independent from reveal frames and retain comparison-profile behavior. Test ordinary and animated names at several widths, including very narrow widths where full names cannot fit.

## Validation plan

Run typecheck, strict validation of this OpenSpec change, and only the focused naming, settings/composition, and footer test files affected by implementation. Cover approval continuation, explicit task prompts, bounded context selection, unrelated-context exclusion, attachment-path noise, fallback, three-word/32-character limits, valid saved preferences, default/menu order, pending format changes, manual rename/cancellation, and narrow footer priorities. Trusted CI remains authoritative; no broad local suites or merge authorization are implied.

## Known gaps

None identified at planning time. Model title quality needs regression fixtures for naming input and deterministic policy; a live model result is not guaranteed by prompt assertions alone.
