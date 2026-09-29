## Context

`streamline-release-publish-handoff` kept one invariant above usability: a public Release and tag never exist without both npm packages. Because the reviewed note is packed inside the application package, the note must be final before packing, so npm had to be staged from a draft. GitHub emits no workflow event for draft edits, which forced the waiting command to poll for a fresh **Save draft** and forced the documentation to warn the maintainer away from the primary **Publish release** button.

Common practice for npm packages publishes from the `release: published` event (GitHub's Node.js publishing guide and most libraries), recovers a failed upload by rerunning the job, and accepts that the Release briefly precedes the registry. Release-PR tools (changesets, release-please) keep the tag after npm but move changelog review out of the Release editor. The maintainer chose to keep review in the Release editor and make **Publish release** the trigger.

## Goals / Non-Goals

**Goals:**

- One command, one edit, one click: `npm run release -- patch`, edit the draft, choose **Publish release**.
- The command exits after preparing the draft; nothing requires a terminal to stay open.
- Slow source validation runs while the maintainer edits, so publication after the click is short.
- A failure before npm leaves the maintainer where they started: an editable draft and no tag.

**Non-Goals:**

- Changing nightly or numbered development publication.
- Moving changelog review into a pull request.
- Guaranteeing that no public Release ever exists without npm; the window is bounded and self-healing instead.

## Decisions

- **Trigger.** `release: published` on a stable, non-prerelease Release is the only stable publication trigger. Trusted default-branch code derives the version from the tag, requires the tag commit to equal the draft's bound source and the current `origin/develop` source recorded at preparation, and requires the publishing actor to be a GitHub `User` with `write`, `maintain`, or `admin`. Apps, bots, tag pushes, and dispatch payloads grant no authority.
- **Validation before the click.** Preparation dispatches the complete stable gate suite on the bound source with the stable version stamped and the generated note, and links the run in the draft body's automation comment or command output. Publication requires that run to have succeeded for the same source. The only difference after the click is the edited note, so publication repacks with the published body and reruns the exact-package gates (package contracts, smoke, startup, installer pair) on the final bytes rather than the full suite.
- **Return to draft.** If publication fails or is cancelled before either package exists on npm, a final `if: failure() || cancelled()` job re-reads the registry, and only when both versions are still absent sets the Release back to `draft: true` and deletes the tag it points at. The tag policy changes from "never delete" to "never move, never reuse, delete only an unconsumed tag whose packages are absent". If either package exists, the Release and tag stay and the maintainer reruns failed jobs; the final registry check makes the rerun an exact-byte no-op for an already-published package.
- **Reopening.** After npm, asset, and `master` succeed, the same workflow creates or exactly reuses `chore/release-<next>-dev`, unchanged from today, and never merges it.
- **Removed.** Save-draft polling and its one-second arming window, `dispatchStableStaging`, `approve-release.yml`, the `a1-stable-release-reviewed` event, and the `a1-stable-staging-v1.json` receipt. `finalize-release.yml` becomes the publisher rather than a verifier.

## Risks / Trade-offs

- A published Release and tag are visible for the few minutes publication takes, and briefly after a failure until the rollback job runs. Mitigation: publication after the click is limited to exact-package gates, and rollback is automatic when npm is untouched.
- A GitHub notification or watcher may observe a Release that later returns to draft. Accepted as the cost of the native button being the trigger.
- The edited note is not covered by the full suite. Mitigation: the note is validated by the packaged-release-note gate and exact-package gates on the final bytes.
- Deleting an unconsumed tag relaxes an existing rule. It remains limited to automation, requires both packages absent, and never repoints a tag.

## Migration Plan

Land the change while no stable draft is open. Remove `approve-release.yml` and the receipt code in the same pull request, update npm trusted-publisher settings if the publishing workflow path changes, and document the new three-step flow in `docs/ci-release-runbook.md`.

## Open Questions

- Whether the full suite should also run after the click when the edited note changes packaged startup behaviour beyond text, or whether exact-package gates are sufficient.
- Whether the pre-click validation run link belongs in the draft body or only in command output.

## Evidence

- Pending implementation.
