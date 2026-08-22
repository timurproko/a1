## Why

A1 now replaces one pinned Pi surface with its own: `/settings` opens the A1 screen and the pinned
selector does not. The parity gate has not caught up with that. It still measures A1 against every
pinned checkpoint, so the seven `/settings` checkpoints are handled by being known about rather than
by being classified — and nothing checks the promise a replacement makes, which is that it drops no
capability the surface it supersedes had.

That gap gets worse with every surface A1 takes over. Without a declaration the gate can read, each
replacement means editing an exclusion list, and an exclusion list cannot tell the difference between
"A1 replaces this deliberately" and "A1 broke this". The first replacement is the moment to make the
gate read a declaration instead.

## What Changes

- Declare each A1-owned surface as data: its id, the app that owns it, the route it answers, and for a
  replacement, the pinned route it supersedes.
- Make the parity runner classify checkpoints from that declaration rather than from a list written
  beside it, so a superseded checkpoint reads as superseded and everything else still has to match.
- Assert what a replacement promises: every capability the superseded surface offered is reachable
  from the surface that replaced it. For settings that means every setting the engine reports.
- Cover the three ways parity should fail: a divergent surface nobody declared, an addition that
  displaces a pinned surface, and a replacement that drops a superseded capability.
- Confirm the declaration reaches only the owned path: `a1 pi` stays vanilla and consults none of it.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: the parity baseline gains a declared surface list that the gate reads,
  the requirement that a replacement drops no superseded capability, and the failure modes that
  make both enforceable.

## Sequencing

This change follows `establish-owned-ui-component-system`, which introduced the settings screen and
the route seam it declares. It was scoped out of that change so the component layer could land on its
own; parity governance is a separate concern with its own failure modes.
