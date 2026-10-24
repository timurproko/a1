## Why

A resident tab keeps the pseudoterminal geometry from the last time that tab was viewed. The first implementation converged it after selection, but that still makes the newly shown UI visibly jump while the child reflows. Hidden tabs should instead be fitted before they become visible.

## What Changes

- Pre-fit globally hidden, unclaimed resident holders whenever an authoritative controller reports new terminal geometry.
- Carry current geometry with each view request and queue any required target resize before enabling its fresh surface publication.
- Preserve per-tab controller authority by excluding tabs currently viewed or controlled by another client.
- Keep the previous coherent frame visible until the target holder publishes a complete frame for the current geometry, without exposing an intermediate old-size target frame.
- Add focused native regression coverage for background resize, switch publication ordering, and resized reattachment flows.

## Capabilities

### Modified Capabilities

- `resident-terminal-host`: authoritative outer resize pre-fits eligible hidden children, while activation stages current controller geometry before the replacement surface can publish.

## Impact

Native terminal-host attach, wire, and routing behavior (`native/terminal-host`) plus focused native tests. No settings, persistence, or user-facing command changes.
