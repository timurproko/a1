## Context

See `proposal.md` for motivation. A1 creates Pi sessions through the public `createAgentSessionServices` and `createAgentSessionFromServices` boundary. Pi's documented `DefaultResourceLoader` options support named inline extension factories, and extension `session_start` and `tool_result` events provide awaited cleanup boundaries across initial creation and session replacement. The selected user profile must remain user-owned and must not be seeded with a managed extension file.

The supplied reference implementation establishes the intended best-effort behavior. Its target discovery is deliberately bounded rather than recursive: current session directory, a simple Bash `cd` target, and write/edit target parents.

## Goals / Non-Goals

**Goals:**
- Remove residual regular `nul` files before subsequent Windows session work can observe them.
- Reinstall the behavior whenever Pi rebuilds cwd-bound services during new, resume, fork, clone, or import flows.
- Keep cleanup isolated from tool results and session startup reliability.
- Make path derivation and platform behavior independently testable on any CI host.

**Non-Goals:**
- Parse arbitrary shell programs or discover every directory a script may enter.
- Rewrite agent-generated commands or change shell redirection semantics.
- Recursively scan a repository for reserved names.
- Add a user-visible setting or alter files under either selected Pi profile.
- Guarantee that an artifact never exists during command execution; the contract is that no artifact remains after the awaited cleanup boundary.

## Decisions

### Use a named inline Pi extension

Add a small Windows-filesystem hygiene module at the Pi integration boundary and provide its named factory through `resourceLoaderOptions.extensionFactories` when services are constructed on Windows. This uses the documented public SDK, keeps the safeguard in source control, avoids mutating user profile resources, and naturally follows Pi's event lifecycle.

Creating a physical extension in `<profile>/extensions` was rejected because profile initialization currently creates only minimum directories and preserves user ownership. Subscribing outside the extension runner was rejected because it would duplicate Pi event dispatch and complicate session replacement.

### Attach cleanup to session-start and tool-result events

`session_start` removes a stale artifact before normal session activity. `tool_result` removes artifacts after operations most likely to create them, while preserving the tool's existing result. Because Pi awaits extension handlers, asynchronous filesystem cleanup can finish before the lifecycle boundary completes.

Command rewriting in `tool_call` was rejected: shell selection and quoting vary, rewriting arbitrary commands can change user intent, and not every source of a residual file is safely recognizable before execution.

### Derive a bounded set of candidate directories

Every tool result checks `ctx.cwd`. Bash results may add the target of one syntactically simple `cd` command, supporting relative, absolute, and singly or doubly quoted paths without attempting full shell interpretation. Write and edit results may add the resolved parent of their declared path. A set deduplicates overlapping candidates.

Recursive search was rejected because it adds unbounded I/O and could remove unrelated content. Full shell parsing was rejected because it would still be incomplete for subprocesses, variables, command substitution, and platform-specific syntax.

### Delete only a directly inspected regular file

For each candidate directory, derive `<directory>/nul`, inspect it without following symbolic links, and unlink it only when it is a regular file. Treat absence, access errors, races, and unlink failures as best-effort no-ops. Use injected platform and filesystem operations in focused tests so Windows policy can be proved on non-Windows CI while a Windows integration case exercises the real path behavior where available.

Deleting every matching directory entry or surfacing cleanup failures was rejected because either behavior could damage unrelated state or turn a hygiene safeguard into a session reliability failure.

## Risks / Trade-offs

- [A command changes directory through complex shell syntax or creates `nul` outside every derived target] → Keep scope explicit and testable; future evidence can add another bounded target source without recursive scanning or command rewriting.
- [Best-effort deletion hides a persistent permission problem] → Preserve the primary agent workflow as required; focused tests prove failures are isolated, while a future observability change can add non-disruptive diagnostics if users need them.
- [A legitimate regular file named `nul` is removed] → Gate behavior to Windows, where `nul` is a reserved device name and a regular entry with that name is the anomalous artifact being remediated.
- [Parallel tool results attempt to delete the same artifact] → Make inspection and deletion idempotent and ignore not-found races.

## Migration Plan

No data or profile migration is required. Ship the inline safeguard with the owned runtime. Rollback removes the factory registration and helper module; no persisted setting or installed extension remains to clean up.
