## Context

See `proposal.md`. The `pull_request_target` workflow deliberately checks out trusted `develop` policy and runs the documentation manager without `npm ci`. All transitively imported policy modules must therefore load using Node built-ins and repository-local modules only.

## Goals / Non-Goals

**Goals:**

- Restore dependency-free loading of the trusted manager.
- Preserve exact patch-successor classification for release reopening PRs.
- Exercise the policy from an installation without `node_modules`.

**Non-Goals:**

- Installing the full dependency tree in the trusted workflow.
- Changing reopening eligibility, documentation allowlists, or merge authority.

## Decisions

- Make the shared release-note policy dependency-free rather than duplicating note validation in the reopening classifier. Replace its `semver` validation and ordering calls with strict numeric-component helpers that preserve the existing canonical stable-version grammar and safe-integer component bound, and expose patch-successor derivation to the classifier. This removes both bare `semver` imports from the manager's transitive graph while keeping one source of truth for release-note parsing.
- Add a subprocess regression fixture that copies the manager's repository scripts into a temporary directory with no `node_modules` and verifies execution reaches environment/event validation rather than module resolution failure. A static import assertion alone would not prove the complete import graph is dependency-free.

## Risks / Trade-offs

- **Local version arithmetic could drift from npm semver behavior** → Limit it to the existing stable numeric grammar, preserve safe-integer validation, and cover ordering plus normal and maximum-safe patch successors.
- **The dependency-free fixture could omit a newly imported local module** → Discover and copy the transitive local import graph rather than maintaining a fixed file list.
