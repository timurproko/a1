# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the pull-request body.

## Reviewed 1.0.4 decisions

The only upstream delta in the keep-owned theme port adds Highlight.js `subst` styling. A1's port constructs Pi's public `Theme`, whose pinned implementation already carries that mapping, so no private theme code is copied. The changed `AgentSession` declaration remains compatible with A1's public session adapters; the changed TUI keybinding declaration is adopted by refreshing the pinned shortcut expectations while preserving A1's explicit path-word aliases.

Azure Foundry and both codemode image changes stay `pinned` because A1 creates sessions through Pi's public service factory and built-in extensions. The upstream CLI-only tool-pattern and `--no-mcp` switches are `declined`: A1 owns its command-line grammar and does not forward Pi CLI filters, while ordinary MCP tools remain available through the hosted session. Generated command resources, provenance, package-integrity records, and parity fixtures move to the 1.0.4 identity.
