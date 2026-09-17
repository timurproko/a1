## ADDED Requirements

### Requirement: Registrations with nothing left to remove are retired
When a released registration's ordinary evidence is not eligible, the sweep and the exact-candidate completed-delivery command SHALL check locally whether anything remains for cleanup to delete: the registered path SHALL be absent, Git SHALL hold no registration for that path or only the candidate's own dangling registration whose `gitdir` names the removed pointer, and the exact local topic ref SHALL be absent. Only when all three hold SHALL cleanup confirm through a bounded remote read that the candidate's pull request is merged into `develop` in this repository, retire the dangling Git registration if present, and mark the journal complete with `retired-nothing-left` and the reason the ordinary evidence gave. Retirement SHALL delete no worktree, ref, or remote ref, SHALL exercise no authority beyond the owner's release, and SHALL leave an entry untouched and ordinarily blocked when any of the path, Git registration, or local ref still exists or when the pull request is not merged. Retired entries SHALL NOT be re-evaluated by later passes.

#### Scenario: Evidence is permanently unverifiable but nothing remains
- **WHEN** a released entry's path and local topic ref are absent, Git holds no live row for it, and its pull request is merged into `develop`
- **THEN** the sweep SHALL retire the entry with `retired-nothing-left` and the original evidence reason, and the next sweep SHALL NOT evaluate it

#### Scenario: Ref still exists
- **WHEN** the path is absent but the local topic ref still exists
- **THEN** cleanup SHALL keep the entry blocked with its evidence reason and SHALL NOT delete the ref

#### Scenario: Pull request is not merged
- **WHEN** everything local is absent but the pull request is open or closed unmerged
- **THEN** cleanup SHALL NOT retire the entry and SHALL report `pending` or `awaiting-discard` as before

### Requirement: Forgetting a dead registration is explicit and non-destructive
The repository SHALL provide one explicit `forget` operation that accepts a registration identity and a nothing-left confirmation flag. Under the mutation lock it SHALL require a released entry whose path is absent, whose Git registration is absent or only its own dangling row, and whose local topic ref is absent, and SHALL then mark the journal complete with `forgotten`. It SHALL read nothing from GitHub, SHALL delete nothing, SHALL refuse without the flag, and SHALL refuse an owned or deleting entry or any entry with a present path, live Git row, or ref.

#### Scenario: Maintainer forgets a rejected candidate removed by hand
- **WHEN** the maintainer invokes `forget` with the confirmation for a released entry whose worktree, Git row, and local ref are all absent
- **THEN** the entry SHALL be recorded `forgotten` and SHALL NOT appear in later sweeps

#### Scenario: Something still exists
- **WHEN** the entry's path, a live Git row, or its local ref still exists, or the entry is owned or deleting
- **THEN** `forget` SHALL refuse with a named reason and change nothing
