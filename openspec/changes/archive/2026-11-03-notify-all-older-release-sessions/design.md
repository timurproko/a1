## Context

See `proposal.md` for motivation. Release discovery and restart-readiness are currently one chain: composition must first obtain a newer registry release, then `requestAutomaticUpdate` can notice that another process already activated it. A failed discovery therefore prevents an old process from consulting authoritative local cohort state. Resident tab strip rendering is native and already polls the shared settings document for live time format, accent, position, and plus-menu changes; its release root also exposes the executing client package version.

## Goals / Non-Goals

**Goals:**
- Make local executing-versus-active release comparison the authority for restart readiness in every published interactive process.
- Bound local observation without increasing registry traffic or coupling active sessions to the updater owner.
- Make the resident outer-client version visible by default and let users independently configure Version and Time.
- Preserve one-row strip geometry, narrow-terminal behavior, and live settings application.

**Non-Goals:**
- Hot-swap or automatically restart old processes.
- Claim that a process launched the newly active version.
- Retroactively change processes running a release that predates this implementation.
- Add version display to `a1 solo` or `a1 pi`, which have no resident tab strip.
- Change update installation, activation, rollback, or registry-discovery semantics.

## Decisions

### D1. Restart readiness gets an independent local observer

The release-update observation will own two independent activities: existing registry discovery/automatic installation, and a local release-state observer. The local observer reads approved cohort state immediately after first-frame startup, reacts promptly when the atomic release-state file changes, and retains a bounded low-frequency fallback check for missed or coalesced filesystem events. It stops when it finds a newer valid same-channel active release, the process disposes, or the process becomes ineligible because its executing version is unpublished. It emits the existing semantic `installed` update once and then stops.

This local read runs in `Auto`, `Notify`, and `No`, and despite network-oriented version-check opt-outs, because it performs no cache read, registry request, worker launch, or mutation. The network path retains every existing eligibility rule. Independent local observation avoids turning filesystem events or fallback checks into cache-lock or registry cadence.

*Alternative:* rely on the existing fifteen-minute discovery loop. Rejected because a failed fetch still suppresses the notice and the delay is too long for an already-completed local activation.

*Alternative:* use either filesystem events or polling alone. Events alone can be lost or coalesced around atomic rename on supported platforms; polling alone adds needless detection latency or frequent reads. Immediate event-driven checks with a bounded fallback preserve responsiveness and reliability.

### D2. One fail-closed local reader defines process staleness

A foundation helper will read bounded cohort state through the existing store and return the approved active package version only when both versions are valid semver, share a release channel, and active is greater than executing. Read, parse, approval, channel, and comparison failures return no result. Composition does not infer staleness from supervisor creation, registry tags, update coordinator text, or user launches.

`requestAutomaticUpdate` will reuse the same comparison helper so installation observers and passive sessions cannot drift in their definition of restart readiness.

### D3. The existing semantic status remains the only session UI

Each process sends the existing `{ status: "installed", version }` event to its own backend. Existing diagnostic de-duplication and compact rendering keep the exact `Update installed, restart to update` notice persistent and non-transcript. Resident Agent processes, solo processes, and comparison processes observe independently; no one process is designated as the broadcaster or completion owner.

This deliberately makes notification process-local but state-derived: every process reaches the same result from shared durable state even if the process that installed the release exits.

### D4. Tab Bar right-side configuration is an ordered flag setting

Add `tabBarRightItems` with ordered keys `version,time`, default `version,time`, and all four subsets valid. The setting is live and appears as `Right side  configure` after `Plus menu`. The Settings multi-select behavior will be generalized from the current Plus Menu dialog so both declarations can supply title, description, ordered rows, search, and immediate persistence without duplicating input logic. Plus Menu's resident-client handoff remains special; Right side can use the in-screen dialog because it configures presentation rather than opening an attach-owned launcher modal.

The owned settings schema version advances once. Older profiles need no explicit value rewrite: absence resolves to the new default. Invalid stored subsets resolve conservatively through the declaration's normal default handling.

### D5. Native strip rendering receives a parsed item set and executing version

The attach client already reads the package version from its immutable `release_root`; that value will be retained for strip rendering and never replaced with the mutable active pointer or a child Agent version. Presentation settings parsing gains a compact right-item set and the existing settings poll includes it in repaint detection.

Strip layout composes one right-side text block in fixed order. `version,time` renders as `v<version>`, two blank cells, then the formatted clock, with the existing trailing blank cell. Single-item configurations render only that item; empty reserves zero cells. On narrow rows, Time keeps the existing rightmost priority and Version is omitted first when both cannot fit. The complete block uses the current dim strip foreground and participates in the same width reservation before chip selection, so hit targets remain unchanged.

*Alternative:* show the active release version. Rejected because the purpose is to identify the code the visible outer client is actually executing; after automatic activation that may intentionally differ from the active pointer.

## Risks / Trade-offs

- [Five-second local polling adds shared-state reads per process] → Stop permanently after restart readiness, use the bounded existing cohort reader, and perform no network or package work.
- [Many old resident processes can report simultaneously] → Each updates only its own in-memory semantic diagnostic; no cross-process writes or duplicate workers result.
- [Full development versions consume strip width] → Reserve the block before chip selection and omit Version first on narrow rows while preserving Time and overflow controls.
- [A malformed setting could hide both items unexpectedly] → Accept only declared ordered subsets and fall back to the default for invalid values.
- [Users currently on a pre-fix release still lack the observer] → One restart into the fixed published release is required; later automatic activations will notify that process correctly.

## Migration Plan

Advance the owned settings schema and ship the new code with `tabBarRightItems` absent-by-default migration semantics. Existing profiles immediately resolve both Version and Time on. Existing processes continue unchanged until restarted into this release; no update can inject the new observer or strip renderer into already-running immutable code. Rollback ignores the additional setting key and returns to the prior clock-only strip.
