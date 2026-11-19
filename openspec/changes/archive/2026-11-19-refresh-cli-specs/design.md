## Context

`openspec/specs/` is written by agents for agents and must describe the current product. Twelve command-line capabilities had requirements that contradict the code, describe delivery process, or describe finished procedures. This change corrects them through deltas only; a bot applies the deltas and archives the change.

## Goals / Non-Goals

**Goals:**

- Every requirement added or modified here states behavior that was read in the code.
- Requirements about delivery, evidence, phases, one-time procedures, and code outside this repository are removed.
- The repository's governance checks pass on the tree that exists after the deltas are applied.

**Non-Goals:**

- No product code, test, or workflow change. Where the spec was arguably right and the code wrong, the spec follows the code and the difference is reported, not fixed.
- No change to Purpose paragraphs; a delta cannot change them.
- No rewrite of requirements that were not verified against the code. They stay as they are.

## Decisions

- **The code wins.** A requirement that disagrees with the code is rewritten to the code. Example: `a1 solo` exits with status 2 in `src/cli/dispatch.ts`, so the "silent no-op" requirement is replaced.
- **Modify when scenarios survive, replace when they do not.** Strict validation refuses a modified requirement that drops a scenario. A requirement that must lose a scenario is removed and a replacement is added under a new name.
- **The private launch context is specified as negotiated.** `src/foundation/launch-context/index.ts` reads the superseded keys as a per-field fallback and writes them for a retained release that declares no contract. The three cutover requirements are replaced by two that state this.
- **Naming governance keeps only what a check enforces.** The identifier rule is enforced by `product-identifier-policy.mjs`, the file-name rule by `check-architecture.mjs`, and the policy shape by `naming-source-policy.mjs`. Pull request review rules are removed.
- **The legacy-name inventory is committed for the applied tree.** The inventory records occurrences in spec files by path, line, and column. Applying the deltas removes four occurrences from `a1-shell` and moves one in `product-identity`. The inventory and allowlist in this change match the tree after the deltas are applied.

## Risks / Trade-offs

- [The inventory matches the applied tree, so `check-docs-governance` and `check-package-identity` fail on this branch until the deltas are applied] → The failure ends with the archive commit. No single inventory can match both trees, because the occurrences are recorded by line.
- [Some requirements still carry history wording or were not verified] → They are left unchanged and listed in the delivery report rather than rewritten from the spec text alone.
- [Removing consumer and plugin requirements loses their text here] → They describe code in other repositories; the archived change keeps the removed headers and reasons.
