# Design

## Context

See `proposal.md` for motivation and `specs/launch-resource-validation/spec.md` for the contract. The existing comment on `assertPiInvocationResources` and `docs/features/pi-compatible-launch.md` both describe strict validation of explicit imports and flags, not every discovered extension.

`createPiSessionFactory` runs the assertion whenever `runtimeOptions` exists. The assertion currently aggregates every service error and extension-load error without checking whether the invocation requested the failing resource. `bin/ui.js` then routes its generic exception to `installFatalExit`, whose intentionally private unexpected-error output omits the reason.

A disposable source-runtime reproduction confirmed that a broken `.pi/extensions/broken.ts` permits a bare launch but rejects `noSession` and a trust grant; denying project trust withholds the extension and starts. No A1 process was launched in Firstmate's real checkout.

Reading Firstmate's `fm-calm.ts` and copying only it and its library into disposable state identified an independent parse failure: `fm-calm-preservation.ts` contains a bare relative-path stub rather than TypeScript. This change must tolerate and report that failure, not repair Firstmate.

## Goals / Non-Goals

**Goals:**

- Use invocation provenance rather than the presence of any launch option to decide whether a resource failure is fatal.
- Share the classification between session startup and catalog invocation validation.
- Keep expected-refusal reporting out of private crash diagnostics and keep the added error machinery off the eager bare-launch graph.

**Non-Goals:**

- Changing trust admission, making failed explicit hooks optional, changing worktree-transition admission, or upgrading Pi.
- Repairing Firstmate files or certifying its full live main/worker lifecycle.

## Decisions

1. **Resolve explicit entries using Pi's resource-source grammar.** Match failed loader paths and explicit-extension registration diagnostics to requested local, directory, manifest and package entries. Preserve original local requests for missing-path detection. Do not use a blanket error list or a directory-prefix heuristic, which respectively rejects unrelated failures or misattributes manifest/package entries. Reuse Pi's public source resolution without re-executing factories; account for resolution/install failures as explicit refusals.

2. **Validate requested extension flags independently.** Require a loaded registration with the correct type. When a missing registration follows a load failure, include the failed-resource context so the person can identify why their flag is unavailable. Service diagnostics for unrelated discovered providers remain available through normal startup reporting rather than becoming fatal.

3. **Use an expected launch-refusal category at the UI entry.** Resource and model-option validation produce that category; the boundary restores terminal state, prints a bounded terminal-safe reason, and terminates with a nonzero status. Unexpected exceptions continue to use the existing crash handler without broadly printing arbitrary exception payloads. Load refusal-only machinery lazily rather than increasing the eager startup graph or relaxing its budget.

4. **Use disposable, offline fixtures and the real launch boundary.** Embedded-runtime tests cover ordinary model/session/trust options with failing unnamed resources, mixed good explicit and bad unnamed resources, explicit files/directories/manifests/missing paths, registration errors and invalid flags. Development-entry tests exercise both names of the normal product and check actual terminal refusal text. Existing fatal-exit tests protect crash privacy and terminal restoration.

## Risks / Trade-offs

- Resolving sources for provenance can duplicate resolver work or retry an installation failure. → Keep this restricted to explicit requests, avoid repeated factory execution, and cover installed package/source resolution with deterministic fixtures before claiming package acceptance.
- Pi exposes provider-registration diagnostic ownership in its formatted extension prefix rather than a structured path field. → Match only the exact explicit-extension prefix and pin this assumption with an embedded integration regression.
- New shared eager imports can exceed the startup graph budget. → Keep the refusal type within the lazy invocation boundary; run architecture checks without increasing the baseline.
- Error text can contain terminal controls or excessive output. → Sanitize and bound expected-refusal output; retain private handling for unexpected failures.
- Preliminary implementation exists locally from before the planning-only instruction. → Leave it uncommitted and unshipped, keep every task unchecked, and review it only after plan approval. Earlier passing checks do not certify the interrupted final state.

## Migration Plan

No user data or settings migration is required. After approval, implement and validate the two outcomes, then deliver through the normal release process. Rollback reverts the launch-validation and expected-refusal changes together; it does not modify stored sessions, credentials or project trust.
