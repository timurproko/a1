## Why

After `0.2.7-dev.1235` activated successfully, restarting A1 launched the current client and reconnected the same live Agent from `0.2.7-dev.1232`, but that immutable predecessor continued rendering `Update installed, restart to update`. The modern structured client-version acknowledgement did not exist in that predecessor, so preserving the Agent also preserved its stale in-memory notice even though the active client already matched the installed target. This violates the existing requirement that updated-client reconnect not keep requesting the same completed restart.

## What Changes

- Treat a valid durable automatic-update record whose installed version exactly matches the launching client as proof that the restart instruction is satisfied for that client.
- Keep the existing structured acknowledgement path for modern resident children.
- Add a narrowly bounded outer-client compatibility projection for immutable structured predecessor surfaces: remove only the exact owned restart-ready footer text when the launching client satisfies the recorded installed target.
- Leave every other child status, style, cursor, transcript row, working indicator, copy acknowledgement, blocked-update notice, malformed state, unmatched version, and unstructured legacy surface unchanged.
- Preserve all live Agent, holder, tool, session, and writer identities; do not restart or mutate predecessor execution to clear presentation state.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `owned-pi-ui-foundation`: hide satisfied restart-ready status after the updated client reconnects, including compatible immutable predecessors that cannot acknowledge client version.
- `resident-terminal-host`: apply an exact structured-surface compatibility projection without changing child execution or broadly inspecting terminal content.

## Impact

- Native attach structured-surface presentation and focused compatibility tests.
- Automatic-update state parsing at the client presentation boundary.
- Existing modern diagnostic acknowledgement remains primary; the compatibility projection is limited to the exact historical restart-ready phrase and valid matching installed state.
- No Agent, holder, tool, source server, session writer, transcript, or durable predecessor record is stopped, restarted, rewritten, or deleted.
