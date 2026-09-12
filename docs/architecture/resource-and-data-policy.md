# Multi-agent resource and data policy

This policy is mandatory for the multi-agent workspace. It prevents one adapter, terminal pane, recovery record, or proof artifact from exhausting the workspace and prevents accidental persistence of credentials or terminal streams.

## Resource budgets

Budgets are minimum defaults, not promises of capacity. An implementation may lower them per agent, adapter, pane, host, or platform, but may not silently remove a limit.

| Resource | Default budget | Required outcome on breach |
|---|---:|---|
| Structured event payload | 64 KiB | Reject only that event and preserve diagnostics |
| Structured snapshot payload | 1 MiB | Reject resynchronization and mark the agent degraded |
| Structured attachment payload | 2 MiB | Reject only that attachment |
| Queued structured events per agent | 256 | Apply negotiated pause, rejection, compaction, or disconnect |
| Concurrent structured commands per agent | 4 | Reject or queue deterministically with a capability explanation |
| Reconnect replay per adapter | 1,024 events | Stop replay, request a snapshot if available, or mark discontinuity |
| Native-host control message | 1 MiB | Close the incompatible protocol channel without touching panes |
| Native topology nodes per tab | 1,024 | Reject the topology mutation atomically |
| Terminal sessions per host | 64 | Reject additional sessions as unsupported capacity |
| Terminal launch arguments | 1,024 | Reject that launch request |
| Terminal environment entries | 512 | Reject that launch request |
| Retained terminal model per pane | Host-defined, always bounded | Apply documented compaction, backpressure, pause, or termination |
| Scrollback per pane | Host-defined, always bounded | Compact from oldest data first without cross-pane mutation |
| Proof evidence file | 16 MiB | Reject and request summarized evidence |
| Diagnostic payload | 256 KiB | Redact, truncate, and retain enough evidence for the failed operation |

Every asynchronous consumer must implement a finite queue or window. Backpressure must isolate the offending agent/pane and must not block unrelated identities.

## Data classification

| Class | Examples | Storage policy |
|---|---|---|
| Workspace metadata | IDs, names, lifecycle, capability versions, topology revisions, recovery references | May persist in the control store |
| Structured payloads | Messages, tool calls, snapshots, attachments | Bound and process; arbitrary payload persistence remains unsupported |
| User-authored prompt recall | Canonical interactive input and bounded provenance | May persist only through the profile-isolated prompt-history policy below, never in the control store |
| Terminal content | PTY bytes, scrollback, selection, rendered cells | Never persist in A1's control store or diagnostics |
| Host topology metadata | Window/tab/pane/session IDs, layout shape, dimensions, revision | May persist; not terminal content |
| Native proof evidence | Artifact hashes, source revisions, workloads, latency/resource measurements, paint diagnostics | May persist in versioned evidence files without terminal content |
| Environment values | `PATH`, profile overrides, arbitrary launch environment | Do not persist; treat as potentially sensitive |
| Credentials and tokens | API keys, OAuth tokens, cookies, auth files, passwords | Never copy, log, or persist outside the owning agent/profile |
| Authentication state | Pi profile auth, provider sessions, platform keychains | Owned only by the selected agent/profile |
| Logs and diagnostics | Failure codes, bounded lifecycle evidence, sanitized status | May persist after classification and redaction |

Sanitization must classify before logging or storing. Unknown or untyped values are potentially sensitive by default and must not be persisted. Terminal bytes must never be written to logs as a debugging shortcut.

## Typed prompt-history retention

The `prompt-history` feature owns only reusable interactive user input, not
structured-message archives. It stores one independent profile database under
`<effective-home>/.a1/data/history`, or `<A1_DATA_DIR>/history` when explicitly
overridden, never agent resources or cache/release directories. The default home
follows launch-profile resolution, including `A1_PROFILE_HOME`; other product
data paths are unchanged. Text is unencrypted and potentially sensitive. Retain up to 100 unique entries (configured
10-100), at most 1 MiB per entry and 8 MiB total canonical text. Background queues
are limited to 32 writes/8 MiB per instance; reads are coalesced, lock retries are
bounded to one second off-thread, and graceful shutdown drains for at most two
seconds. SQLite page/journal limits and a 64 MiB maintenance threshold bound
physical growth separately from text retention.

Only typed canonical text, submission identity, recency/timestamp, input kind,
and bounded cwd/session provenance are allowed. No image bytes, transformed
agent prompts, environment/credential copies, tool results, terminal streams, or
private input in diagnostics are permitted. Disabling persistence is next-start
and does not erase data or stop other live instances. Upgrades, ordinary npm
uninstall/reinstall, and cache/release cleanup must not touch history. The new
default starts fresh without probing, importing, or deleting the old platform
store. Any old-store removal is a separate manual operation after its users have
stopped, not startup or cleanup behavior. See [prompt history](../features/prompt-history.md) for
retention, failure semantics, profile identity, and stopped-instance removal.

## Required architectural outcomes

- Structured/RPC semantics must not be inferred from ANSI text, terminal timing, or visual content.
- Native-host protocol code must not carry PTY bytes, per-event child input, rendered cells, cell grids, framebuffers, or screen buffers.
- `a1 pi` must not import, initialize, launch, or connect to composed terminal-host infrastructure.
- Transparent direct attachment must remain independent of composed infrastructure and must not relay terminal data.
- Recovery records store identity and bounded references, not terminal streams, authentication material, or arbitrary environment values.
- A failed in-terminal 2×2 proof cannot be waived to merge composed infrastructure.
- Proof automation must not launch, focus, drive, resize, or close terminal applications on an active workstation.

The executable repository policy tests cover these invariants alongside the architecture checker.
