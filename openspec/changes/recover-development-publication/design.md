## Context

The maintainer approved fixing the staged-package early return and retaining the normal live publication progress during recovery. Failed publication 43848101865 staged 0.2.7-dev.1327 but could not promote the installer tag because npm denied dist-tag permission. The command then returned nothing to build or publish, though both next tags still named 1307. A separate failed-job rerun succeeded after npm permissions were corrected.

## Decisions

- Keep authoritative origin/develop and numbered preview resolution in the develop entry. Move its testable pair-publication orchestration into the existing publication client and call it from the entry.
- Read both exact versions. Only if both exist, read each package's dedicated dist-tags endpoint without cache. An already-published result requires both next tags to equal the exact numbered version; existence or a partial promotion alone is insufficient.
- For missing, staged-only, or partially promoted pairs, dispatch the existing development workflow. Existing package bytes are verified and exercised by the workflow rather than overwritten. Keep its immutable package checks, native validation/smoke, installer-first promotion, and newer-tag refusal unchanged.
- Use the same dispatchPublication function and observer for fresh and recovery requests. Print recovery intent before dispatch, then the normal run link, job states, counters, and final success/failure summary. Existing interrupt handling leaves the remote run alive and reports its URL.
- After workflow success, re-read both exact versions and both next tags. Fail rather than claim publication if a version is absent or either tag is wrong. Registry HTTP errors or malformed tag responses fail closed.
- Test with fake registry and GitHub boundaries. Do not dispatch real publication, change npm settings, or mutate tags as local validation.

## Risks

An incomplete publication reruns the existing workflow, including its required native checks, rather than only the failed promotion job. This is deliberate: the command does not invent weaker recovery authority. A transient registry error is surfaced instead of treated as absence. A newer public version remains protected by the workflow's existing promotion guard.

## Known gaps

Implementation pending. Local fake-boundary tests cannot establish live publication recovery; the maintainer may choose a separately authorized publication after integration.
