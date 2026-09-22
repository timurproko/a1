## 1. Add bounded pull-request discovery

- [x] 1.1 Add a typed repository PR probe that invokes `gh` without a shell, validates open state, exact head branch, positive number, and HTTPS GitHub URL, and returns silent absence for unavailable, malformed, mismatched, closed, or timed-out results.
- [x] 1.2 Integrate immediate and 60-second serialized refresh with the Pi runtime lifecycle; verify startup is not blocked, unchanged results do not emit redundant views, probes never overlap, and disposal cancels timers/work and ignores late completion.

## 2. Carry PR identity through the owned footer contract

- [x] 2.1 Extend `OwnedUiFooterView` and its runtime validation with the optional normalized pull-request identity; verify valid values survive snapshots and partial, nonpositive, or unsafe values fail closed.
- [x] 2.2 Populate the adapter footer from runtime repository metadata without exposing CLI errors or GitHub-specific review state.

## 3. Render the linked badge

- [x] 3.1 Append `PR #<number>` after path and branch and before session name for the bare-A1 footer profile only; verify absent metadata leaves the existing row unchanged and the pinned `a1 pi` profile remains byte-for-byte unchanged.
- [x] 3.2 Keep `PR` footer-grey and apply the established web-link theme role and an OSC 8 target to only `#<number>`; verify hover/Ctrl+click metadata resolves to the canonical PR URL and surrounding path, branch, prefix, spacing, and session text are not linked.
- [x] 3.3 Preserve ANSI-aware truncation and footer width bounds; verify narrow rows close hyperlink/color state without leaking a target or style to adjacent cells or following rows.

## 4. Validate and hand off

- [x] 4.1 Run focused repository-probe, engine lifecycle, owned-contract, footer component, hyperlink-boundary, and bare-versus-pinned profile tests and record the implementation evidence.
- [x] 4.2 Build the exact candidate and provide a Windows Terminal manual comparison showing the badge appears for an open branch PR, opens the canonical URL on Ctrl+click, disappears when no open PR is associated, and leaves `a1 pi` unchanged.
