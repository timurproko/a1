# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the pull-request body.

## Reviewed 1.3.0 decisions

The one vendored conflict, in the session tree selector, keeps A1's public-package imports and adopts Pi's new public `formatReadLineRange`, so tree rows label `read` ranges the way Pi 1.3 does, including numeric-string and null arguments. The new required `sessionShareDestination` setting and its callback are wired through A1's settings contract, bridge, and port, and the Pi artifact startup totals are re-pinned to the 1.3 measurement.

A1 adopts the share destination instead of declining it. Pi's share module is not in the public API and is bound to Pi's interactive mode, so A1's owned `/share` reproduces its route: under `auto` it uploads the branch JSONL with Pi's `pi.share` trailing entry to the Radius gateway when the model runtime has a Radius credential, and otherwise creates the existing secret gist; `gist` and `radius` force a route. The gateway URL is copied from the pinned runtime and must be re-checked on each upgrade.

The four other new features stay `pinned`: cache-preserving GPT-6 thinking changes, Kimi Code over Chat Completions, and clean model switching live in the model runtime, and resumed sessions restore their tool loadout inside `AgentSession`. User-visible behavior therefore follows Pi 1.3 for those, and `models.json` overrides of the `kimi-coding` base URL must now end in `/v1`.
