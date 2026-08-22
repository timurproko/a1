## Why

A1 does not forward Pi's screen to the terminal; it draws Pi's interface itself, through its own
runtime, layout, text measurement, and input handling. The parity gate exists to prove that drawing is
faithful: it runs pinned Pi and A1 side by side, types the same script into both, and compares 55
checkpoints. That is a statement about A1's rendering layer.

The gate has been measuring the wrong thing. It runs against the product, and the product is
deliberately diverging: `/settings` opens an A1 screen now, so eight checkpoints can never match. The
answer so far was to declare the replacement and have the gate classify it — which means every screen
A1 takes over adds another thing the gate must be told to forgive. The viewport, the prompt, paste and
history are next. A gate that grows a forgiveness list stops being a gate.

The measurement should not include the product's own experience at all. Rendering fidelity is a
property of the layer, so it is measured with the layer alone: A1's shell, components, and input, with
every owned surface switched off, against pinned Pi. Nothing to declare, nothing to forgive, and the
answer stays meaningful however far the product's own experience travels.

The gate is also too late. It runs only in the release tier, so a rendering regression is found when
someone publishes — several merges after it landed, with the offending change to be hunted down.

## What Changes

- Parity is measured against A1 with its owned surfaces off, not against the product. Every one of the
  55 checkpoints must match pinned Pi, with no superseded checkpoints and no classification.
- The parity composition is the product's own composition with owned surfaces disabled, never a second
  implementation, so it cannot quietly drift into testing itself.
- The product's own experience is not compared to Pi. It is answered by its own component and screen
  tests and by manual acceptance.
- Parity runs on every merge into `develop` and again when publishing, on Linux. A failure is pinned to
  one squash commit rather than to a range.
- A failing run publishes what it saw: the side-by-side diff in the log, and both sides' checkpoint
  snapshots as artifacts, so a parity question can be shown rather than described.
- The promises `launch-profiles` already makes are verified rather than assumed: `a1 sandbox` reads and
  writes only its own profile, and `a1 pi` launches and exits cleanly.
- A replacement still has to keep every capability of the route it supersedes reachable. That check
  moves out of the parity comparison, where it never belonged, and is made directly: every setting the
  engine reports is reachable from the settings screen.

**BREAKING**: none for the product.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: parity is measured with owned surfaces off, so a declared replacement is no
  longer something the comparison has to classify. Declarations still govern what the product may add
  or replace, and a replacement still keeps the superseded route's capabilities reachable.
- `continuous-integration`: rendering parity is a standing check that runs per merge and at publish
  rather than only at release, and a failure publishes the evidence for it.

## Sequencing

This follows the accepted settings work. It is best built alongside the agent viewport, which is the
second surface to be taken over and therefore the first real test of whether switching owned surfaces
off is as simple as it sounds.
