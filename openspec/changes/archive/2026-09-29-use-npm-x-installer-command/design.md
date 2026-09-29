## Context

The preferred installation currently runs the dependency-free `@timurproko/a1-install` executable with `npx -y`. Supported npm exposes `npm x` as the short alias of `npm exec`, so it can acquire and execute the same package without changing installer behavior. npm options and package-executable options share one command line, however, and npm itself consumes recognized options such as `--help` unless a `--` boundary introduces the package command.

## Goals / Non-Goals

**Goals:**

- Present every preferred A1 installation form as an `npm` command.
- Continue executing `@timurproko/a1-install` so users retain custom progress, activation, verification, and preview-number selection.
- Make option forwarding unambiguous for current and future installer arguments.
- Keep all current installation documentation and the canonical contract synchronized.

**Non-Goals:**

- Replacing the installer with direct `npm install --global`.
- Changing package names, release tags, target grammar, installer output, activation, or self-update behavior.
- Rewriting archived OpenSpec records that accurately document the former command.

## Decisions

### Use npm's short executable runner

The preferred form becomes `npm x -y -- @timurproko/a1-install`. `npm x` is npm's supported alias for `npm exec`; it preserves transient package acquisition and runs the package's sole `a1-install` binary. The no-confirmation flag remains npm-owned and retains the current first-use behavior.

### Require the argument boundary

Every documented form includes `--` before the package spec:

```sh
npm x -y -- @timurproko/a1-install
npm x -y -- @timurproko/a1-install --develop
npm x -y -- @timurproko/a1-install --develop 107
npm x -y -- @timurproko/a1-install --develop 0.1.8-dev.107
```

This follows `npm exec -- <package> [args...]` grammar and prevents npm from consuming installer-owned options. Omitting `-y` remains supported as `npm x -- @timurproko/a1-install` and may show npm's acquisition confirmation.

### Preserve historical records and runtime behavior

Only current guidance, the canonical specification, and any assertions that enforce them change. Archived delivery records remain untouched. No installer JavaScript or package manifest changes are needed because invocation through the npm alias reaches the existing binary.

## Risks / Trade-offs

- **Readers may omit the unfamiliar `--` delimiter.** → Keep every copy-paste example structurally identical and explain that arguments after the boundary belong to A1's installer.
- **A stale active `npx` example could preserve the inconsistency.** → Search current README, package, docs, specifications, tests, source, and scripts while excluding immutable archives and dependencies.
- **The documentation could claim equivalence without exercising package forwarding.** → Run the published installer help through `npm x -y -- @timurproko/a1-install --help` and retain the existing installer tests for target behavior.
