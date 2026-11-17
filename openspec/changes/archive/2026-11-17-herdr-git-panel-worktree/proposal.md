# Follow the active A1 worktree in Herdr Git panels

## Why

An A1 session launched from home can attach to a repository worktree while Herdr's Git panel still says “Not a git repository”. A1 deliberately changes its effective project context without process-global chdir, while Herdr currently selects the foreground process or parent terminal directory.

## What Changes

- Extend A1's existing endpoint-ready native Herdr reporting with the active project directory, bound to the same session/runtime identity and heartbeat.
- Publish only committed active context; attaching, switching, detaching and completing a worktree update the report after context replacement succeeds. Failed or pending transitions retain the prior valid report.
- Make the private Herdr customization's shared directory resolver consume a generic project-directory capability. Keep A1 and Claude Code signal parsing in separately registered provider adapters, using Claude's existing session-root report and A1's added equivalent signal; prefer a fresh normalized project directory over foreground and shell launch paths for the exact terminal.
- Preserve ordinary directory fallbacks for absent, malformed, stale and unsupported reports, including local and remote machine routing.

## Capabilities

### Modified Capabilities
- `herdr-a1-integration`: identity-bound active project directory reporting and directory selection for Git panels.

## Impact

A1 changes are scoped to native reporter ownership/readiness, focused fixtures and integration documentation. No process-global directory change, API control operation, terminal-input injection, native Herdr/Core patch, automatic restart or tab relocation is included.

The consumer lives outside this repository in `C:/Users/tprokopiev/.config/herdr-app/customizations/`, managed through yadm. Its canonical shared directory helper and packaged consumers require coordinated source changes and separate evidence. Generated and installed files must not be edited directly. A1 publication and consumer deployment remain distinct rollout steps; an old running A1 cannot be assumed to report the new field.

The original plan was approved for implementation; the maintainer subsequently approved replacing the A1-specific consumer with an agent-agnostic provider boundary in the same delivery.
