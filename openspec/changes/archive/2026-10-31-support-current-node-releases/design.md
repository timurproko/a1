## Context

`runInstaller` rejects the runtime with a regex that admits only 22.19+, 23.x, and 24.x, and both manifests declare `>=22.19.0 <25`. The cap dates from the initial implementation with no recorded reason. Native addons target Node-API 9, which is ABI-stable across Node majors, and no locked dependency declares an upper Node bound. The published development package was smoke-tested on Node 26.13.0: `a1 --version`/`--help`, `node:sqlite` in WAL mode, and loading `process-guardian.node` and `terminal-host.node` all succeeded.

## Goals / Non-Goals

**Goals:** Let the current and future Node.js LTS lines install and run A1; make the old-runtime failure name the detected version and the required minimum.

**Non-Goals:** Add CI lanes for Node 26, raise the minimum, or change any other installer failure wording.

## Decisions

- Compare parsed numeric major/minor (`major > 22`, or `22` with minor `>= 19`) instead of an enumerating regex, so new majors need no installer release. The runtime version is injectable through `runInstaller` options for tests and defaults to `process.version`.
- Keep the floor-only engines range `>=22.19.0` in both manifests. An upper cap blocks new users every October when Node promotes a new LTS, while Node-API keeps the addons loadable.
- Print the old-runtime result as its own complete line, without the `installation failed:` prefix, from both the in-run and outer error paths. The failure still exits with status 1. Every other failure keeps the established prefix and vocabulary.

## Risks / Trade-offs

- A future Node major could remove an API A1 uses before CI covers it. Mitigation: a later CI lane for the current LTS; until then, regressions surface through user reports rather than an install refusal.

## Migration Plan

No data or format migration. Older installers keep their stricter gate; users pick up the new gate with the next `npm x` run.
