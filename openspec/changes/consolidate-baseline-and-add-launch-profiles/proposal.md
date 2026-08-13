## Why

The manually accepted transparent terminal path is now a reliable single-foreground baseline, but the repository still carries redesign-era wording, contracts, tests, workflows, and layout choices that can obscure which code is authoritative. Before adding product features, AddOne needs a deliberately small production baseline, enforceable feature ownership and documentation rules, and explicit launch profiles for normal AddOne, vanilla Pi comparison, and isolated extension experimentation.

## What Changes

- Freeze transparent direct attachment as the supported single-foreground rendering/input baseline. Do not continue PTY, emulator, relay, or composed-terminal option iteration in this change; AddOne-managed tabs for arbitrary interactive CLIs remain a separate future composed-terminal capability.
- Audit every production file, test, workflow, document, and deferred physical artifact; delete or consolidate items that no longer own a current contract, while retaining permanent lifecycle, release, update, protocol, storage, launch, and zero-interception guards.
- Replace redesign-era and implementation-history commentary with concise production documentation. Keep source comments only for non-obvious rationale, safety invariants, platform constraints, and public contract semantics.
- Establish and enforce a feature-oriented source/test/documentation layout with one repository-level package/lockfile/dependency installation, thin public feature entries, private internals, explicit dependency direction, and no generated/runtime state in feature source trees.
- Add three explicit transparent launch profiles with equivalent `a1` and `addone` spellings:
  - bare `a1`/`addone` launches normal AddOne Pi using `~/.a1/agent`;
  - `a1 pi`/`addone pi` launches the vanilla Pi baseline using its normal `~/.pi/agent` profile;
  - `a1 sandbox`/`addone sandbox` launches Pi using isolated `~/.a1/sandbox` settings and resources.
- Define sandbox as configuration/resource isolation, not an operating-system security boundary. Do not copy, link, or overwrite credentials or profile files automatically.
- Keep maintenance commands (`version`, `update`, `update:next`) distinct from launch profiles and reject ambiguous/unknown AddOne subcommands without interpreting them through a shell.
- Close the prior terminal-redesign decision: record the published transparent preview, select direct attachment, mark raw relay not applicable, and move physical certification plus composed multi-tab terminal work into separate future changes.

## Capabilities

### New Capabilities
- `launch-profiles`: Command grammar, profile roots, Pi configuration/resource isolation, vanilla baseline behavior, and safe profile initialization for bare AddOne, Pi, and sandbox launches.
- `project-structure-governance`: Production feature ownership, dependency direction, test ownership, documentation/comment policy, and repository hygiene requirements for future development.

### Modified Capabilities

None. The prior foundation change remains the historical source for transparent terminal contracts; this change closes its decision and creates focused forward-looking capabilities.

## Impact

- Affects CLI dispatch, transparent launch profile construction, environment selection, user path resolution, tests, architecture policy, workflows, README/architecture documentation, and OpenSpec lifecycle.
- Introduces `~/.a1/agent` and `~/.a1/sandbox` as user-managed Pi profile roots while preserving direct Pi's `~/.pi/agent` behavior.
- May move existing modules and tests into feature-owned folders without changing accepted terminal behavior.
- Removes obsolete/deferred implementation artifacts from the active baseline; physical certification evidence remains in Git/OpenSpec history and a future isolated-worker change.
- Adds no terminal emulator, PTY dependency, native renderer, desktop automation, or per-CLI terminal workaround.
