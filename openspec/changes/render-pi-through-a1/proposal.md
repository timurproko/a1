## Why

A1 does not forward Pi's screen to the terminal; it draws Pi's interface itself,
through its own runtime, layout, text measurement, and input handling. Whether that
drawing is faithful is the one thing about A1 that can be measured against an
authority, and it is measured by comparing A1 with pinned Pi at fifty-five
checkpoints.

Until now the comparison had nothing honest to run against. Bare `a1` is the
product, and the product is deliberately diverging — `/settings` is A1's own screen,
so eight checkpoints could never match. The answer being built was a hidden
environment variable that withheld A1's surfaces for the duration of the test: a
mode that exists only while a robot is watching, which is how a compatibility mode
rots into something that passes forever while the product breaks.

`a1 pi` is the honest place for it. It currently launches vanilla Pi transparently,
which proves the launcher and nothing about the rendering. Making it Pi's interface
through A1's own stack turns the parity comparison into a comparison of two things a
person can open side by side, and makes what is measured a command someone actually
uses.

## What Changes

- `a1 pi` presents pinned Pi's interface through A1's rendering and input, with none
  of A1's own surfaces. It is what the parity comparison runs, and what a reader can
  open next to vanilla `pi` to see the same thing.
- `a1 sandbox` keeps the transparent vanilla behaviour, which is what trying an
  extension against Pi itself requires.
- The parity run launches that command rather than setting an environment variable,
  so nothing about the measurement is private to the measurement.

**BREAKING**: `a1 pi` no longer launches vanilla Pi transparently. Anyone wanting
vanilla Pi itself uses `a1 sandbox` for an isolated profile, or Pi directly.

## Capabilities

### Modified Capabilities

- `launch-profiles`: the `pi` subcommand renders pinned Pi's interface through A1's
  own stack rather than attaching transparently, and `sandbox` remains the
  transparent vanilla profile.
