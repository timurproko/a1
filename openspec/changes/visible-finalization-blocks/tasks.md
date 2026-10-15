## 1. Visible finalization blocks

- [ ] 1.1 Return a `blocked` disposition when a fully checked task-list draft is refused for a content reason, and keep unfinished drafts, retries, and infrastructure skips unchanged.
- [ ] 1.2 Make the finalization CLI emit an error annotation and exit 1 for a `blocked` result.
- [ ] 1.3 Cover blocked, unchecked, and retry drafts in the finalization governance tests.

## 2. Local delivery body check

- [ ] 2.1 Add `scripts/governance/check-delivery-body.mjs` with `--body-file`, `--pr`, and `--final`, reusing the trusted body validators.
- [ ] 2.2 Cover valid, incomplete, and invalid bodies, including angle-bracket placeholders, with governance tests.

## 3. Guidance

- [ ] 3.1 Tell agents in `.agents/skills/change-delivery/SKILL.md` to run the body check before checking the final Implementation item.
- [ ] 3.2 Document the body check and the rejected item content in `docs/openspec-archive-automation.md`.

## 4. Validation evidence

- [ ] 4.1 Run the focused governance tests, strict OpenSpec validation, and preflight, then record the results and any known gap before finalization.
