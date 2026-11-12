# Focused implementation evidence

## Environment and scope

- Host: Windows (`win32`), Node `v24.21.0`, repository-pinned Vitest `3.2.7` and OpenSpec `1.11.0`.
- Owning checkout: `D:/Git/a1/.worktrees/warm-startup-payload-support`, branch `fix/warm-startup-payload-support`, PR #919 into `develop`.
- The maintainer approved the presented planning-only PR and requested implementation. Implementation ticks report written code/tests, not human acceptance or required CI success.
- Dependencies were installed in this worktree with `npm ci --ignore-scripts`; no manifest/lockfile changes or unrelated audit fixes were made.

## Characterization and repair

Before changing bootstrap, the new real materialization/certification fixture failed all three initial payload variants (color, literal prompt, combined) at the first warm launch with the reported unsupported-retained-UI diagnostic. Cold launch had already succeeded, and `readRestartCertifiedRelease` returned exactly `files: [bin/ui.js]`. This reproduced the defect without inspecting or editing installed releases or existing agents.

After the payload-only authenticated full-manifest fallback was added, those three variants passed cold and two repeated warm launches. Additional coverage now includes the empty literal boundary, unsupported cold/warm selections, damaged/mismatched complete evidence, another installed candidate, and deterministic no-payload operation counts.

## Local checks

- `npm run build:core`: passed, generating ignored worktree-local `dist/` metadata needed by the bin typecheck. The initial pre-build typecheck's source leg passed; its bin leg failed because this fresh worktree had no `dist/`. The post-build full typecheck passed.
- The following explicitly selected owner files passed: **10 files, 114 tests**, with no broad directory/tier suite or preflight. The update-launch file was rerun afterward with stronger per-selected-release manifest-call assertions: **40 tests passed**.

```bash
cd /d/Git/a1/.worktrees/warm-startup-payload-support && npx vitest run test/foundation/release/startup-arguments.integration.test.ts test/foundation/release/update-launch.test.ts test/foundation/release/restart-certification.test.ts test/foundation/release/release-store.test.ts test/foundation/release/bootstrap-boundary.test.ts test/cli/session-color.test.ts test/features/owned-ui/project-trust-prompt.test.ts test/composition/startup-color.test.ts test/composition/session-colors.integration.test.ts test/ui/settings/session-colors.test.ts
```

- `npm run typecheck`: passed after build and test changes.
- Strict OpenSpec validation and whitespace checks passed for outcome one and are repeated before the final push. Final body/readiness checks belong to the delivery step; no required exact-head CI success is inferred here.

## Observable results

- Supported cold and repeated compact warm launches preserve exact color/literal argv and selected release identity.
- The guard's metadata read is tied to the selected release ID, version, content digest, root, and managed store; unsupported selections fail before their UI spawn.
- Real missing, malformed, and different-identity full manifests after compact admission fail closed. Existing release-store/restart fixtures retain identity, digest, root, platform, read-only evidence, dependency binding, and recovery checks.
- Color and literal prompts independently follow update-prior selection, installation-failure retained fallback, newer-active selection, activation races, and support changes during bounded reselection. No prior supported release can authorize a newly selected unsupported one.
- Two ordinary warm launches over both small and 100-extra-file releases have equal compact evidence operation counts and zero support-only full-manifest, materialization, complete-verification, or repair calls. Capability resolution does not introduce recursive payload discovery or full rehash.
- Existing discovery, first emitted trust/editor color, acknowledged live control, peer isolation, replacement policy, and comparison behavior pass. The composition test additionally confirms saved settings bytes remain unchanged after overridden startup, live Current-color edits, and committed replacements.

## Deferred or unclaimed evidence

- Physical Windows first-frame smoke, native Unix execution, and Core-only live SSH smoke were not authorized or run. Disposable Windows filesystem/process/composition fixtures do not claim those certifications or a live Herdr deployment.
- The external Herdr customization contract path remains unavailable; the supplied brief and maintained repository contracts were sufficient for this producer-only change.
- Existing fallback diagnostics can surface the original installed-tree error after rejecting an unsupported retained payload. This preserves the existing policy and still fails before unsupported UI spawn; no payload is silently dropped or retried without the override.
- Trusted automation owns readiness, finalization, broad/selected required CI, and final candidate identity. Maintainer integration remains a separate exact-candidate decision. No installed release, manual certification, existing agent, or remote companion/App configuration was modified.
