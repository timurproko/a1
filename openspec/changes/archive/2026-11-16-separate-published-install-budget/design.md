## Context

The maintainer approved separating five-minute installation deadlines from the existing two-minute predecessor-update deadline. Run 43840564157 failed at install-application after 120014 ms with npm and its parents still alive. The last npm downloads completed at 114594 and 115079 ms, the target manifest existed, and no launchers existed. This proves the harness deadline interrupted an incomplete install, not that the installation would necessarily have succeeded. Prior hosted evidence records successful fresh installs at 124146 and 127863 ms.

## Decisions

- Name independent installation and update constants. Apply five minutes to fresh install, predecessor install, and authenticated repair install; keep lightweight installer acquisition at two minutes and metadata/launch commands at thirty seconds.
- Keep the update budget accessor and authenticated legacy-crash failure probe unchanged in behavior. A generic timeout still never authorizes repair, and an incomplete target still never counts as success.
- Use a twenty-five-minute exercise-step timeout and thirty-minute job timeout. The longest compatibility path can consume nineteen minutes across acquisition (2), fresh install (5), predecessor install (5), update (2), and repair install (5), plus bounded metadata, launches, diagnostics, and settlement. The outer limits leave headroom rather than clipping that path at eight minutes. They remain emergency backstops, not normal command deadlines.
- Preserve live progress, ten-second process sampling for commands budgeted at least two minutes, pre-cleanup failure checkpointing, identity-pinned settlement, unconditional evidence upload, and all promotion prerequisites.
- Cover stage-specific budgets and completion beyond the old two-minute limit with focused tests, including repair, plus workflow backstop assertions.

## Risks

A genuinely stalled installation can take five minutes to fail. The two-minute update deadline still fails promptly, and authenticated legacy crashes still use their existing early probe. Five minutes is a bounded allowance, not proof of hosted publication recovery.

## Implementation observations

The smoke now uses independent five-minute installation and two-minute update constants. Acquisition remains explicitly bounded to two minutes. Fresh, predecessor, and authenticated repair installs use the installation constant. The native Published pair exercise and job backstops are twenty-five and thirty minutes respectively; other jobs remain unchanged.

Focused contracts cover stage-specific budgets, fresh and predecessor installs completing at a simulated 128 seconds with exact-package and launcher assertions still applied, recovery installation versus direct-update budgets, progress messages, and outer backstops with unchanged unconditional evidence upload and promotion prerequisites.

Focused local validation passed: 60 tests across smoke evidence, explicit installer recovery, promotion/workflow policy, and process ownership, including native Windows detached-process settlement. Strict OpenSpec validation, the final delivery-body check, and diff whitespace checks passed. Core build and both typechecks passed; the initial bin typecheck required the fresh worktree's missing build output, then passed after the core build. The branch includes current origin/develop.

## Known gaps

No unresolved implementation gap is identified. Exact hosted publication recovery must be established by a separately requested publication; local tests do not establish that result. This change does not promote or republish the already staged pair.
