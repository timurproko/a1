# Manual Pi-boundary candidate checkpoint

This checkpoint is user-controlled. Do not automate it on an active workstation, send synthetic desktop input, or claim a pass without a person completing the observations.

## Prepare the exact local candidate

From a clean checkout of the candidate commit:

```powershell
npm ci
npm run check
npm pack --ignore-scripts --pack-destination artifacts/manual-pi-boundary
npm install --global --prefix artifacts/manual-pi-boundary/install artifacts/manual-pi-boundary/timurproko-a1-*.tgz --ignore-scripts
$Candidate = Resolve-Path artifacts/manual-pi-boundary/install/a1.cmd
```

Use the exact generated filename if wildcard expansion is unavailable.

## User-controlled checks

1. **Bare owned UI:** run `& $Candidate`. Confirm startup, typing, submission, transcript streaming, selector focus, mouse/keyboard scrolling, and ordinary shutdown.
2. **Extension surfaces:** in bare UI use `/reload`, then exercise configured extension notification, select, confirm, input, editor, replacement custom surface, and overlay custom surface. Confirm cancellation restores editor focus.
3. **Vanilla oracle:** run `& $Candidate pi`. Confirm untouched Pi uses the ordinary `~/.pi/agent` profile and does not show owned-UI or workspace surfaces.
4. **Isolated profile:** run `& $Candidate sandbox`. Confirm Pi uses `~/.a1/sandbox` and starts with project approval disabled for that run.
5. **Resize and input:** while each mode is active, narrow and widen the terminal, enter Unicode and multiline text, use history/navigation keys, and scroll in both directions.
6. **Shutdown:** exit normally, then repeat and use Ctrl+C during work. Confirm the parent prompt remains usable and no child remains attached.
7. **Recovery:** after any owned-UI failure, run `& $Candidate pi`; confirm the vanilla oracle remains available. Restart bare UI and confirm its normal profile remains intact.

Do not remove `~/.a1/agent`, `~/.pi/agent`, or `~/.a1/sandbox` during this checkpoint.

## Verdict recording

Before a person performs these commands, the verdict is **READY, MANUAL EXECUTION PENDING**. After execution, record candidate commit, tarball SHA-256, platform, terminal, each observation, and an explicit pass/fail. A preview publication may remain Windows-only and uncertified; this checkpoint does not establish stable cross-platform support.
