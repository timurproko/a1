## Why

On Windows, shell redirection patterns used by agent-generated commands can leave a literal `nul` file in the working tree. Windows treats that reserved name specially, so the artifact can be difficult for users and ordinary tools to inspect or remove.

## What Changes

- Add a Windows-only runtime safeguard that removes residual regular files named `nul` after relevant Pi tool executions and when a session starts.
- Cover the active session working directory, a simple directory entered by a Bash command, and directories targeted by write or edit tools.
- Keep cleanup best-effort so a missing, inaccessible, or non-file target never disrupts the session or changes a tool result.
- Apply the safeguard to Windows sessions using the shared owned Pi runtime while leaving non-Windows sessions unchanged and writing nothing into either user profile.
- Add focused automated coverage for platform gating, cleanup targets, and failure isolation.

## Capabilities

### New Capabilities
- `windows-filesystem-hygiene`: Defines automatic removal of residual Windows `nul` artifacts created around agent tool activity.

### Modified Capabilities

## Impact

- Affects the owned Pi runtime integration and its focused tests.
- Uses Pi's documented inline-extension and lifecycle event APIs plus Node filesystem/path APIs already available to the project.
- Adds no dependency, user setting, profile file, or migration, and does not mutate the ordinary Pi profile.
