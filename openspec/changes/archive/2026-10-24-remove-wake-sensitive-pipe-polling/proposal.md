## Why

After machine sleep and wake, existing and newly launched A1 instances reportedly suffer severe, recurring delays in menu scrolling and streamed agent output. The Windows resident transport has a demonstrated timer-sensitive readiness path shared by those activities; its polling can add scheduler ticks at multiple hops, while the existing resume handler only repairs painted state. Remove that dependency and add targeted observations so the actual wake-triggered failure can be distinguished from child, ConPTY, and outer-terminal stalls.

## What Changes

- Replace Windows resident named-pipe readiness polling with completion-driven, independently progressing read and write operations, including bounded admission and cancellation.
- Preserve owner-only endpoint admission, non-inherited handles, generation-1 frames, ordered reliable control, replaceable surfaces, and existing connection/resource bounds.
- Extend the opt-in, bounded, payload-free progress observations with local monotonic transport durations and explicit attach wake-gap/repaint observations.
- Add focused Windows native regression cases for coarse timer conditions, idle-to-interactive traffic, fragmented frames, duplex progress, shutdown, and existing/new connections across a simulated wake gap.
- Keep the existing one-shot resume repaint; do not restart resident processes or replay prompts to recover responsiveness.

This is a proposal, not a claim that a physical sleep/wake reproduction or production fix has already passed. The design records measured transport sensitivity separately from the still-unconfirmed wake trigger.

## Capabilities

### Modified Capabilities

- `resident-terminal-host`: Windows transport progress does not depend on sleep-based readiness polling or effective multimedia timer resolution, and opt-in observations distinguish wake recovery and transport delays without recording terminal content.

## Impact

Primarily `native/terminal-host/src/endpoint.rs`, `roles/wire.rs`, native role I/O ownership, `roles/progress_observation.rs`, and focused native tests. Implementation may update native observation consumers and `docs/architecture/resident-tabs.md` for the new additive diagnostic fields. Unix endpoint behavior, Pi rendering cadence, provider streaming, stored sessions, registry schema, and the generation-1 wire format remain unchanged. No implementation is authorized by this planning PR until the maintainer approves the plan and requests it.
