## Why

Two things in this repository claim to be about faithfulness, and neither is earning it.

The first is the automatic comparison: a robot drives pinned Pi and A1 side by side and compares
fifty-five checkpoints. It has never caught a difference a reader cared about. The one real difference
found so far — an entire palette collapsing to sixteen colours — it could not have reported, because the
collapse applies to both producers at once and the two wrong screens agree with each other. Meanwhile it
demands a growing apparatus: a scenario file, a comparator, a checkpoint inventory, governance tests that
test the gate, evidence artifacts, and a CI job. The user reads the two screens side by side and sees in
seconds what the robot cannot express, and will do that when a change warrants it.

The second is the launch story. Bare `a1` draws Pi's interface itself, `a1 pi` does the same with A1's own
screens withheld, and `a1 sandbox` does something else entirely: it starts the real Pi program as a child
process and stands aside. One product, two ways of putting a screen on the terminal, and the second one
exists only for the profile it reads.

## What Changes

- Retire the automatic terminal parity comparison: its runner, scenario, comparator, checkpoint capture,
  governance tests, CI job, and npm command. Parity becomes a thing the user checks by hand, by running
  `a1 pi` beside `pi`, when a change warrants it.
- Give every interactive form one pipeline. `a1`, `a1 pi`, and `a1 sandbox` all run A1's own rendering and
  input; they differ in the configuration root they read and in whether A1's own screens are reachable.
  Bare `a1` reaches them; `a1 pi` and `a1 sandbox` present pinned Pi's interface and nothing of A1's own.
- Remove the transparent attachment path, which had no caller left once sandbox joined the pipeline.
- Remove the worktree cleanup command, which never reliably removed what it listed; worktrees are removed
  deliberately instead.

## Impact

- `a1 sandbox` is drawn by A1 rather than by a child Pi process. Its profile root is unchanged.
- A parity regression is now caught by a person looking, not by a gate. That is a deliberate trade: the
  gate was reporting agreement, not fidelity.
