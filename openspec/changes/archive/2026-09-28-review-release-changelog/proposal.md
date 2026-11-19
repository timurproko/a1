## Why

Stable publication currently starts before the only release-related pull request is created, and the resulting GitHub Release contains only a generic publication sentence. The installed bare-A1 `/changelog` screen meanwhile presents Pi's pinned dependency changelog, not the changes in the A1 release the user installed. A maintainer therefore has no reviewable place to correct user-facing release notes before immutable package bytes are published, and users do not see those approved notes after installation.

## What Changes

- Make `npm run release -- <target>` generate an A1 release-note document from the pull requests merged since the previous stable release and open a dedicated draft-free release-review PR before stable publication.
- Keep that generated document as ordinary committed Markdown so the maintainer can read and edit it in the PR. Only an authorized manual merge of a valid current release-review PR allows the command to dispatch stable publication; CI success or PR creation alone remains insufficient.
- Build the reviewed note and release-note history into the exact application package, use the same reviewed Markdown for the GitHub Release, and retain the existing post-publication next-development PR as a separate manual gate.
- Change bare A1's `/changelog` reference screen to present A1's reviewed release notes. On the first bare-A1 launch of a newly installed stable version, open that version's note automatically in the existing full-screen reference screen, after the first input-ready frame and after any safety-critical startup modal.
- Record a bounded, per-product-profile acknowledgement only after the automatic screen is successfully presented and closed, so later launches do not reopen it. Development previews do not auto-open stable notes, and `a1 pi` keeps Pi's pinned changelog behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Put a manually merged, editable release-note PR before stable publication; bind package and GitHub Release notes to its reviewed content while preserving exact-source publication and the separate development-reopening PR.
- `owned-pi-ui-foundation`: Present packaged A1 release notes in bare A1 and automatically open the matching stable note once after installation in the existing full-screen reference screen.

## Impact

The change affects release orchestration and its GitHub fixtures, release workflow/package assembly, GitHub Release creation, package-surface validation, owned UI composition and startup routing, release-note acknowledgement storage, changelog/reference-screen tests, release documentation, and release/OpenSpec governance. Stable releases gain one manually merged notes PR before publication while retaining the manually merged reopening PR afterwards. No release is published during planning or implementation of this change.
