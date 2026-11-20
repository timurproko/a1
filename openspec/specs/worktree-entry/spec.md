# worktree-entry Specification

## Purpose
Decides how `a1 worktree enter` obtains the checkout of a task branch: through a command the repository declares, or by creating the checkout itself when the repository declares none.

## Requirements

### Requirement: A repository may declare how its task checkouts are started

A repository MAY declare a `start` command in the committed `.a1/worktree.json` of its primary checkout, as a non-empty array of strings in the same form as its `cleanup` command. When `a1 worktree enter` needs a new checkout for a task branch in such a repository, A1 SHALL run that command instead of creating the checkout itself, and SHALL attach the session to the checkout the command reports.

#### Scenario: Declared start command creates the checkout

- **WHEN** a repository declares a `start` command and a person runs `a1 worktree enter fix/login` for a branch that has no checkout
- **THEN** A1 runs the declared command and attaches the session to the checkout the command reports

### Requirement: The declared start command receives the task's branch and base

A1 SHALL run the declared command without a shell, from the primary checkout, and SHALL substitute `{primary}` with the primary checkout's path, `{branch}` with the requested task branch and `{base}` with the name of the base branch selected for the entry.

#### Scenario: Selected base reaches the command

- **WHEN** a person runs `a1 worktree enter fix/login --base release` in a repository whose `start` command contains `{base}`
- **THEN** the command receives `release` in that position

#### Scenario: Declaration is read from the primary checkout

- **WHEN** the session is attached to a task checkout whose own `.a1/worktree.json` differs from the primary checkout's
- **THEN** A1 uses the `start` command of the primary checkout's file

### Requirement: A1 accepts only a registered checkout of the requested branch

The declared command reports the checkout as an absolute path on the last non-empty line of its standard output. A1 SHALL attach to that path only when it is a registered worktree of the selected repository, is not the primary checkout, and has the requested task branch checked out. In every other case A1 SHALL refuse the entry, keep the session's previous context, and delete nothing.

#### Scenario: Command reports a checkout outside the repository folder

- **WHEN** the declared command reports a registered worktree of the repository that lies outside the repository's folder and has the requested branch checked out
- **THEN** A1 attaches the session to it

#### Scenario: Command reports a path that is not a checkout of the branch

- **WHEN** the declared command reports a path that is not a registered worktree of the repository, or one with a different branch checked out
- **THEN** A1 refuses the entry with a reason that names the reported path, and the session keeps its previous context

#### Scenario: Command fails

- **WHEN** the declared command exits with an error or reports no path
- **THEN** A1 refuses the entry, relays the command's own output, and creates no checkout itself

### Requirement: A task branch that already has a checkout is resumed where it is

In a repository that declares a `start` command, when the requested task branch is already checked out in a registered worktree of that repository, A1 SHALL attach the session to that worktree without running the command, wherever the worktree lies.

#### Scenario: Branch already checked out in a pooled checkout

- **WHEN** a repository declares a `start` command and `fix/login` is already checked out in a registered worktree outside `.worktrees/`
- **THEN** `a1 worktree enter fix/login` attaches the session to that worktree and runs nothing

### Requirement: The declared start command runs only for a trusted repository

A1 SHALL run a declared `start` command only when the person has already trusted the selected repository. For a repository that is not trusted, A1 SHALL refuse the entry before running anything, say that the repository must be trusted first, and keep the session's previous context.

#### Scenario: Untrusted repository

- **WHEN** a person runs `a1 worktree enter fix/login --repo <path>` for a repository that declares a `start` command and that they have not trusted
- **THEN** A1 runs no command, refuses the entry and says the repository must be trusted first

### Requirement: An unusable declaration is refused, not ignored

When `.a1/worktree.json` contains a `start` entry that is not a usable command, or one that uses a placeholder A1 does not provide, A1 SHALL refuse the entry with a reason that names the file, and SHALL NOT create the checkout itself.

#### Scenario: Malformed start entry

- **WHEN** a repository's `start` entry is an empty array, or is not an array of non-empty strings
- **THEN** `a1 worktree enter` is refused with a reason that names `.a1/worktree.json`, and no checkout is created

### Requirement: Without a declared start command, entry is unchanged

In a repository that declares no `start` command, including one whose `.a1/worktree.json` declares only `cleanup`, A1 SHALL create and resume task checkouts as `.worktrees/<short-description>` in the primary checkout, with the same base selection and the same refusals as before this change.

#### Scenario: No declaration

- **WHEN** a repository has no `.a1/worktree.json` and a person runs `a1 worktree enter fix/login`
- **THEN** A1 creates `.worktrees/login` from the selected base and attaches the session to it

#### Scenario: Branch checked out elsewhere without a declaration

- **WHEN** a repository declares no `start` command and `fix/login` is checked out in a worktree outside `.worktrees/`
- **THEN** `a1 worktree enter fix/login` is refused as a branch collision, as before
