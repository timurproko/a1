## Why

A session started outside Git cannot currently enter or attach a task worktree, and attachment changes tool paths without changing loaded project resources. Startup location should not prevent explicit repository selection or leave agents editing one repository under another repository's instructions.

## What Changes

- Add a cwd-independent structured worktree control tool with attach, enter, detach, status, list, and complete operations; retain CLI compatibility and add explicit repository selection.
- Derive repository identity from the selected target, retain the immutable startup directory as the detach destination, and preserve exact runtime/claim verification and atomic failed-switch behavior.
- Reload target project settings, instructions, skills, extensions, and trust through supported Pi runtime recreation while preserving the conversation and session writer ownership.
- Sequence transitions at a safe execution boundary so no command executes in a new checkout under stale project resources; keep completion cleanup bound to the selected repository's verified primary checkout.

## Impact

Affected owners: foundation lifecycle, launch session-context requests, CLI dispatch, composition runtime registry, Pi engine runtime/tools, and worktree documentation. This intentionally removes startup-repository restrictions without granting merge, deletion, or ownership-takeover authority.

## Authorization

The maintainer approved the proposed cwd-independent API and explicitly selected full project-context reloads across repositories with the instruction “2 implement it”. Integration remains separately authorized.
