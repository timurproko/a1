## Why

Automatic names can describe an approval prompt as `Implement task` instead of identifying the work being approved. The 16-character limit removes useful task words, and a narrow footer hides the name before reducing detailed statistics.

## What Changes

- Generate task-specific automatic names from bounded relevant conversation context, the current prompt, and verified worktree/branch hints; interpret short approvals as continuing the concrete task rather than as the task itself.
- Prefer two or three descriptive words, enforce a maximum of three words and 32 characters including separators, and avoid generic approval/action labels and attachment paths as task names. Use context-aware deterministic fallback when provider generation fails.
- Make Sentence case the default and first format choice, followed by Kebab case and Title Case; preserve valid explicit format preferences and manual names.
- Preserve the session name before detailed statistics on a narrow footer: compact or trim stats first, then truncate the name only when the remaining space is insufficient.

## Capabilities

### Modified Capabilities
- `a1-shell`: relevant-context naming, descriptive short-label bounds, and name-first footer width allocation.
- `owned-ui-settings`: Sentence case default and first format choice.

## Impact

Session-naming policy/controller, owned conversation/naming contracts and adapter only as needed for bounded context, settings declarations/presentation/composition, footer layout, focused tests, and maintained naming documentation. Preserve tool-free non-blocking generation, current-context and session-binding guards, manual-name ownership, automatic reveal, and comparison-profile behavior.
