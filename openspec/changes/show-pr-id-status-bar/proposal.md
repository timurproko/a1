## Why

The bare-A1 footer identifies the working directory and Git branch but not the open pull request associated with that branch. Users must leave the terminal or run a separate command to find the PR, even though the terminal already supports native link hover and Ctrl+click behavior.

## What Changes

- Discover the open GitHub pull request associated with the current working tree branch through the GitHub CLI, without making GitHub availability a startup requirement.
- Carry the bounded PR number and URL through the owned footer view model and refresh it while the session remains active.
- Render `PR<number>` immediately after the path and branch in bare A1, using the established web-link color and an OSC 8 target so terminal hover and Ctrl+click open the pull request URL.
- Omit the badge when the directory is not a Git repository, no open PR is associated, GitHub CLI/authentication is unavailable, or the probe fails or times out.
- Keep the `a1 pi` comparison footer unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: The declared bare-A1 footer addition exposes the current branch's open pull request as a terminal-native link without changing the pinned comparison profile.

## Impact

Implementation will primarily affect the Pi engine's repository metadata probe, the vendor-neutral owned footer contract, and the owned session footer renderer. Focused engine, contract, footer rendering, hyperlink, truncation, and lifecycle tests will be added. No settings, persisted data, Git state, GitHub mutation, or installed Pi package changes are intended.

This change contains planning artifacts only, not implementation.
