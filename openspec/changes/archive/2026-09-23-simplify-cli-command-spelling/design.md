## Context

The CLI has one top-level parser and typed dispatch outcomes. Help/version currently recognize only flags, package grammar is parsed only after `pi`, and direct `update` already owns stable, development, and model-refresh selection. Package operations ultimately share one typed request handler and one pinned-style message renderer, so the new surface can be added without duplicating profile or package logic.

Existing contracts deliberately keep unknown top-level words quiet, preserve `a1 update self` as a removed silent form, reject attempts to update the pinned Pi runtime, and distinguish syntax exit status two from operation failures. Those boundaries must survive the expanded recognized grammar.

## Goals / Non-Goals

**Goals:**

- Normalize preferred and compatibility spellings into the existing typed help, version, update, and package requests.
- Keep direct `update` selection deterministic across self-update, package-update, and model-refresh forms.
- Render focused package help and syntax guidance in the namespace the user entered while making complete help and README examples direct-only.
- Prove aliases perform identical operations without launching the interactive runtime.

**Non-Goals:**

- Removing existing flags or supported `a1 pi` package forms.
- Adding project-local package scope, package configuration, A1 plugins, or independent Pi runtime updates.
- Changing package-manager behavior, profile storage, update transactions, or pinned transcript styling.

## Decisions

### Parse direct commands as aliases of existing typed operations

The parser will recognize `help`, `version`, `install`, `remove`, `uninstall`, and `list` at the top level. Direct package verbs will reuse the package grammar and produce the same `PackageCommandRequest` values as their `a1 pi` counterparts. This avoids a second package execution path and makes alias equivalence structural rather than incidental.

A separate direct-package handler was considered and rejected because it would duplicate profile preparation, error mapping, and operation dispatch.

### Partition direct update by its first selector

Direct `a1 update` will retain the following precedence:

1. no argument: stable A1 self-update;
2. `--develop [target]`: development A1 self-update;
3. `--models`: model catalog refresh;
4. `--extensions`: update all installed packages;
5. one accepted positional source: update that package.

The removed `self` spelling remains a silent no-op, and `pi`, `--self`, and `--all` do not become alternate ways to update the pinned runtime. Extra values and conflicting selectors remain recognized syntax failures. This explicit partition is preferable to passing every remaining value into package handling because it protects the existing update and pinned-runtime contracts.

### Preserve invocation context only for presentation

Package parsing will carry whether the user entered the direct or `a1 pi` namespace into focused help/error rendering, while operation requests stay namespace-neutral. Direct invocations will show direct usage and `a1 help`; compatibility invocations will keep `a1 pi` usage only after the user explicitly invokes one. Complete application help, generated usage, and README examples will advertise only direct forms.

Always rendering only direct syntax was considered but rejected because it would unnecessarily change compatibility transcripts. Always rendering `a1 pi` was rejected because it would tell users of the new direct commands to add back the namespace this change removes.

### Give direct update one complete focused help surface

`a1 update --help` and `a1 update -h` will describe stable, development, model, all-extension, and single-package forms together. The compatibility `a1 pi update --help` remains package-focused. This prevents direct help from hiding either half of the deliberately combined direct update grammar.

## Risks / Trade-offs

- **[More top-level words become active commands]** → Recognize only the specified verbs, preserve quiet behavior for every other word, and test that no package or runtime handler runs for unsupported grammar.
- **[Direct update can dispatch the wrong operation]** → Pin selector precedence and assert every self-update, package-update, model-refresh, removed, pinned-runtime, and malformed branch independently.
- **[Aliases drift in behavior or output]** → Compare parsed requests, dispatch calls, exit codes, and focused transcript context across preferred and compatibility forms.
- **[Retained aliases clutter help]** → Advertise only preferred direct forms while keeping compatibility parsing covered by tests.

## Migration Plan

Ship the new forms additively and update documentation in the same candidate. Existing scripts using flags or `a1 pi` package commands continue to work. Rollback restores the old parser/help/documentation without any data migration because both namespaces use the same profile and operation layer.
