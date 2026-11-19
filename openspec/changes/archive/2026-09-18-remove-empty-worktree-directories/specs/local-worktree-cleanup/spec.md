## MODIFIED Requirements

### Requirement: Automatic authority is explicitly registered and released

Cleanup SHALL act only on locally registered paths bound to the Git common directory, repository identity, OpenSpec change, associated PR, worktree role, expected HEAD, and any exact local topic ref. Registration SHALL NOT itself authorize deletion. The owning delivery session SHALL explicitly release the candidate to the local cleanup service after stopping its use; a resumed session SHALL acquire ownership before touching it. Claim, release, and cleanup SHALL be mutually exclusive. Active, unknown-owner, stale-owner, and Git-locked worktrees SHALL remain protected; process disappearance or elapsed time alone SHALL NOT release ownership. The only unregistered path cleanup MAY remove is an empty directory tree directly under the approved worktree root, as defined by the empty-directory requirement; every other unregistered path SHALL remain untouched.

#### Scenario: Owner has finished with the checkout
- **WHEN** the owner explicitly releases a registered worktree and no session holds it
- **THEN** cleanup SHALL be permitted to evaluate it without requesting another per-worktree confirmation

#### Scenario: Another session owns or reacquires the worktree
- **WHEN** a worktree has active ownership or a session wins the ownership claim before cleanup
- **THEN** cleanup SHALL leave it untouched

#### Scenario: Owner resumes to repair a failed PR check
- **WHEN** a PR check fails, including a routine inherited failure, and the owning session resumes its retained checkout to repair it
- **THEN** delivery SHALL fix and repush in the same worktree, branch, and PR without requiring a separate proposal solely for that repair, reclaiming any released registration before touching it
- **AND** the repair SHALL preserve tested behavior and required validation gates, require current-head CI and renewed acceptance, and SHALL NOT authorize cleanup or merge

#### Scenario: Session exits without release
- **WHEN** ownership appears stale because the process disappeared or stopped reporting
- **THEN** cleanup SHALL require explicit ownership recovery rather than assume the worktree is abandoned

#### Scenario: Existing folder has no registration
- **WHEN** a folder that contains any file, link, or Git metadata resembles a merged branch or contains an ancestor of a merged PR but has no explicit registration
- **THEN** automatic cleanup SHALL leave it untouched and report it as unmanaged

## ADDED Requirements

### Requirement: Empty unregistered directories under the worktree root are removed
During each execution pass's unmanaged scan, cleanup SHALL remove an unregistered entry directly under the approved worktree root only when all of the following hold: the entry and every nested entry is a directory by link-aware inspection and none is a symbolic link, junction, file, special entry, or `.git` entry; Git lists no worktree row for the path, including prunable or locked rows; the entry's modification time is at least ten minutes old; and the emptiness walk completes within the ordinary content-inspection allowance and pass deadline. Removal SHALL proceed bottom-up using only the non-recursive directory-removal primitive, so a directory that gains content between verification and removal is retained rather than deleted, and SHALL check the stop control and cancellation immediately before each removal. Cleanup SHALL report a removed tree as `removed` with reason `empty-directory` and step `empty-directory-removed`, SHALL report a tree whose removal fails because a handle is held as `blocked` with reason `empty-directory-locked` and retry it on a later pass, SHALL report a directory younger than the grace as `unmanaged` with reason `empty-directory-recent`, and in preview SHALL report a removable tree as `unmanaged` with reason `empty-directory` while deleting nothing. Sweep lines SHALL name each removed or locked empty directory. This requirement SHALL grant no authority over any directory containing content, any path Git lists, or any registered candidate, whose own journaled steps remain the only removal path.

#### Scenario: Git left an empty folder after removing a worktree
- **WHEN** an execution pass finds an unregistered directory under the worktree root whose subtree holds only directories, which Git does not list, and which was last modified more than ten minutes ago
- **THEN** cleanup SHALL remove it bottom-up, report `removed (empty-directory)` with step `empty-directory-removed`, and name it in the sweep lines

#### Scenario: Unregistered folder holds content
- **WHEN** an unregistered directory contains any file, link, special entry, or `.git` entry at any depth
- **THEN** cleanup SHALL leave it untouched and report it `unmanaged` as before

#### Scenario: Folder is being created or was just emptied
- **WHEN** an unregistered empty directory was modified less than ten minutes ago, or Git still lists a worktree row for its path
- **THEN** cleanup SHALL leave it untouched and report it `unmanaged`, with reason `empty-directory-recent` for the young directory

#### Scenario: Preview finds an empty folder
- **WHEN** a preview pass finds a removable empty directory
- **THEN** it SHALL report `unmanaged (empty-directory)` and SHALL delete nothing

#### Scenario: Empty folder is held open
- **WHEN** the directory-removal primitive fails because a process still holds the directory
- **THEN** cleanup SHALL report `blocked (empty-directory-locked)`, leave the remaining directories in place, and retry on the next pass
