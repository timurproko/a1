# Design

## Where the empty folders come from

Git's `worktree remove` deletes the checkout tree first and its administrative directory second, and it deliberately continues to the second step when the first fails ("there's no going back from here"). On Windows the first step fails at the very last `rmdir` whenever another process holds the directory open: a terminal whose current directory is the worktree, an editor, Explorer, or a search indexer. Every file is already gone, the registration is gone, and only the empty top-level folder remains. Managed cleanup recovers because its journal still names the path: the next pass classifies the folder as residue, verifies it holds nothing, removes it, and continues. A folder removed outside the tooling, or before the tooling existed, has no journal entry, so the unmanaged scan reports it on every pass and nothing ever removes it.

## Why an empty directory may be removed without registration

The unmanaged rule exists because a directory's name, age, or ancestry says nothing about whether its contents are wanted. An empty directory tree has no contents: deleting it loses no file, no link, no Git metadata, and no history. The safeguards therefore reduce to proving emptiness and avoiding races, and both are decided locally without any remote read:

- **Real directory, not a link.** The entry under the root must be a directory by `lstat`, never a symbolic link or junction, and every nested entry must be the same. A link, file, socket, or `.git` entry anywhere in the subtree makes the whole tree non-empty; the scan stops at the first such entry and reports `unmanaged` as today.
- **No Git row.** `git worktree list --porcelain` is consulted once per pass; a path Git still lists, even as prunable or locked, is never touched here. Such a path either belongs to a registered candidate (whose own journaled steps retire it) or is someone's worktree in the making.
- **Grace period.** `git worktree add` creates the directory before it populates it, and a concurrent managed removal can be mid-flight. A directory whose modification time is younger than ten minutes is reported `unmanaged (empty-directory-recent)` and left alone; the next pass sees it again once the grace has elapsed. The threshold is deliberately coarse because the cost of waiting one more pass is nothing.
- **Bounded walk.** The emptiness walk shares the ordinary content-inspection allowance so a pathological tree of thousands of empty directories defers instead of stalling the pass.

Removal is bottom-up with the non-recursive `rmdir` primitive only. That primitive cannot delete a file, so a directory that gains content between verification and removal fails with `ENOTEMPTY` instead of losing anything. `EBUSY`, `EPERM`, and `EACCES` on Windows mean a handle is still open: the pass reports `blocked (empty-directory-locked)` for that directory, leaves whatever remains in place, and the next pass retries. The stop control and cancellation are checked immediately before each removal, exactly as before the journaled destructive steps.

## What preview and lines show

Preview reports `unmanaged (empty-directory)` and deletes nothing, so `preview --repo` still answers "what would the sweep remove" before anything runs. Execution passes report `removed (empty-directory)` with the step `empty-directory-removed`, and `sweepLines` names each removed directory so the session relays it; plain `unmanaged` rows stay hidden from the lines as they are today. `status` is unaffected because nothing is registered.

## What this is measured by

After merge, one `sweep` from the primary checkout removes `.worktrees/erasable-syntax-only` and names it in its lines; the following sweep reports nothing for that path. A fixture directory containing one file, a symbolic link, or a nested `.git` stays `unmanaged` with the file untouched; a fixture directory younger than the grace stays; a path that Git lists stays; a nested tree of only empty directories is removed as one row; preview never deletes; a directory held open reports `blocked (empty-directory-locked)` and is removed on the next pass after release.
