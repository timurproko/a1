# Design

## Historical findings

The pre-pivot reference is `9f0307c0^`; `d78c5c9c` (#781) corrected the original trigger and reasoning-model budgets.

- `src/features/resident-tab/auto-name.ts` normalized lowercase ASCII hyphenated names to at most 16 characters. It tried 4,096 and then 32,768 completion tokens, each with a 30-second abort deadline, then used the first three prompt words or `new-task` as deterministic fallback. Only the first 500 prompt characters entered its naming instruction.
- `src/composition/resident-tab-bridge.ts` armed naming on `agent-run-started`, then retried launch on transcript/view events because Pi can announce the run before projecting its user message. It selected the first user block and attempted naming once per tab process.
- `PiEngineAdapter.generateResidentTabName` delegated to `PiPromptSuggestions.completeInstruction`. That helper used the active model, transformed conversation and system prompt, an appended naming instruction, and no tools. It rejected errors, truncation, and tool calls without adding a conversation turn.
- The bridge applied through the name workflow and tagged registry updates automatic. It rechecked default-name ownership after generation, but its process-local attempt flag and default-name string checks cannot support persistent context-aware regeneration.
- The pivot removed this path. Current `PiPromptSuggestions` serves contextual editor suggestions only; it is not a general naming API.
- The later pre-pivot `native/terminal-host/src/roles/strip.rs` replaced the original rainbow with `tab_secondary_accent`, matching the theme's `secondaryHeading` projection. Its deterministic frames use a 600 ms tonal shimmer over the old name, a 45 ms per-grapheme typewriter reveal, then a 300 ms fade to settled gray. Active frames reserve the wider clipped endpoint width. Without truecolor it uses a plain typewriter reveal only.

## Current integration points

- `src/integrations/pi/engine/session-events.ts` still publishes `agent-run-started`, user transcript updates, and public session-info changes.
- `src/integrations/pi/engine/workflow-runner.ts` owns manual `/name`; its underlying `AgentSession.setSessionName` persists the name and emits `session_info_changed`.
- `src/integrations/pi/engine/repository-metadata.ts` observes linked repository context on a five-second poll. Its current public selection contains cwd and branch only; neither identifies an unseen exit/re-entry.
- `src/foundation/lifecycle/session-repository-context.ts` owns durable association, atomic worktree claims, link, and unlink. Its context record has `updatedAt`, but that timestamp is not a semantic revision and must not be used as one.
- `src/composition/session-runtime-registry.ts` adapts lifecycle association reads into the engine. `sessionBindingGeneration` and the current session file already provide rebinding guards.
- `src/app/session-shell/session-terminal-presentation.ts` already publishes authoritative name changes as terminal titles. No second title writer or terminal-title animation is needed.
- `src/integrations/pi/components/upstream/components/session-footer.ts` renders the status-bar name in the path row; `shell-footer-status.ts` adapts it to the neutral footer port. `src/integrations/pi/components/upstream/theme/theme.ts` already derives the live secondary-heading color from the configured accent. Footer name frames must be styled separately instead of being flattened into the enclosing dim path text.

## Decisions

### 1. Name the session, not a terminal or tab

Introduce a small `session-naming` feature with explicit owner registration, a public entry, and mirrored tests. Keep policy independent of Pi. Composition connects semantic events, settings, validated repository context, and narrow naming ports. Pi-only model completion, session-entry access, and name application remain under the engine adapter owner. Lifecycle remains unaware of naming.

Enable only for bare A1, controlled by `sessionAutoName` (default true). Setting disablement cancels outstanding work. Existing title/footer/selector consumers receive the persisted authoritative name through normal metadata events. Do not restore the retired tab setting, registry, native runtime, or default `agent N` identity rules. Port the name-reveal behavior into the current status-bar presentation without restoring native dependencies.

### 2. Persist a semantic association revision

Extend the durable association contract with an opaque revision. A successful transition to a different linked worktree gets a fresh revision. Clearing and then linking the same worktree gets a fresh revision even when both operations occur between polls. Relinking an unchanged valid association is idempotent; runtime activation, claim heartbeats, and ordinary metadata refreshes preserve its revision.

Retain legacy-record compatibility and establish a stable revision for legacy associations under the existing mutation gate. Expose the validated revision through the existing lifecycle-to-engine adapter, not through a feature import into foundation. Distinguish confirmed absence from unavailable/unverifiable reads: transient probe errors must not invent an exit. Preserve existing claim safety and do not change process/tool cwd.

Use session binding, canonical repository identity, association revision (or confirmed unlinked state), and confirmed branch as the naming-context key. HEAD advances, PR checks, dirty files, and repeated snapshots are not naming triggers. A confirmed branch switch can invalidate context; an unavailable branch cannot.

### 3. Regenerate on the next user prompt

For an unnamed session, arm on a user-prompt run and wait for that run's user message if projection is later. Select that run's prompt, not `transcript.find(first user)`. Do not trigger on slash commands, compaction, automatic retries, assistant/tool messages, or bare startup.

On a confirmed context transition, cancel obsolete work and mark the new context pending, but retain the displayed name. Generate once when a fresh user prompt starts in that context. Worktree churn during a running turn does not reinterpret its already-consumed prompt as a new task; it leaves naming pending for the next prompt. Several transitions without a prompt coalesce to the latest context. If a transition predates delayed projection, the run-start context still determines whether that prompt is eligible.

Build naming input from the current prompt and bounded current worktree/branch hints. Do not prepend the entire old conversation, old title, tool output, or local filesystem contents: those can bias a reused session toward its previous task. Repeated prompts in an already named unchanged context do not invoke naming. Resume with the same completed context also does not invoke naming. A changed persisted context is eligible on the next prompt.

### 4. Persist provenance and apply conditionally

Store versioned A1 naming metadata in a non-conversation Pi custom entry: automatic source, applied name, associated authoritative name-entry identity, and completed naming-context key. Keep this out of model-visible conversation and UI transcript. No new global naming database or prompt log is needed.

Names without verifiable automatic provenance are user-owned, including legacy names whose spelling resembles the old generated format. Explicit `/name` and external public name changes take ownership even when the resulting text equals the previous automatic name; use entry/version identity, not string equality alone. Manual ownership survives resume and worktree transitions. A failed or missing provenance write must fail conservatively rather than allowing a later automatic overwrite.

Expose a guarded, silent automatic-name operation rather than dispatching a user-facing `/name` workflow. Immediately before its synchronous session mutation, validate session file/binding, the authoritative current association revision/context, expected name-entry identity, automatic/unnamed ownership, setting state, and cancellation. Revalidate authoritative association state at apply time rather than relying only on the last five-second poll. There must be no asynchronous gap between the final ownership/binding check and name mutation. An older request cannot rename another session or overwrite a manual edit. Follow normal session-info/view publication after success.

A cross-process association can change during completion or just before apply. Resolve the exact revision under existing lifecycle coordination for the guarded apply boundary; if that boundary cannot establish a current revision, skip application and leave the latest context pending. Do not add a parallel claim system or hold the mutation gate across provider I/O.

### 5. Retain bounded generation, not obsolete coupling

Keep the old 16-character lowercase hyphenated format, deterministic fallback, 4,096 then 32,768 token budgets, and 30-second per-attempt deadlines. A dedicated Pi naming adapter uses the active session's authenticated model runtime with a small isolated naming request and no tools; do not repurpose the editor suggestion API or import Pi into the feature. Treat the supplied task text as data and reject tool calls, error responses, and unusable output. Provider failure on a still-current request may use fallback; context invalidation or cancellation must never apply fallback.

Run at most one request chain at a time, abort on context/session change, disablement, and disposal, and ignore late responses even if the provider does not honor cancellation. Naming never blocks the main prompt, changes its busy state, emits an agent message, or reports an agent failure. Recheck the active session/model at request boundaries.

### 6. Reveal automatic status-bar name changes in the secondary accent

Animate only the status-bar session-name segment after a successful automatic apply changes its visible name, both for first generation and context-driven regeneration. A deterministic neutral frame helper under `src/ui/components/` supplies grapheme-safe phase and width behavior; the session presenter owns the short-lived clock and render requests, while the Pi footer adapter supplies theme styling and terminal-width measurement through existing ports. Extend the footer presentation contract narrowly as needed; do not introduce a free-running timer inside rendering or a second session-name authority.

Port the later tab behavior: 600 ms tonal secondary-accent shimmer over the previous name, reveal the new name at 45 ms per grapheme using that same color family, then blend to the footer's ordinary dim text over 300 ms. With no previous name, the old-name phase is empty; the first name still receives its colored reveal. Use the active theme's derived secondary-heading color (currently projected to `mdHeading`), not the primary accent, fixed RGB copies, or the earlier rainbow. Resolve the live theme during frames so an accent change updates colors without restarting time. In palette/non-truecolor mode preserve the plain typewriter and stable width, without generated truecolor escapes or a color sweep.

Carry an explicit binding-scoped automatic-apply identity/source with the authoritative name presentation. Exactly one changed automatic apply starts a reveal; duplicate metadata/view updates and unrelated streaming, usage, PR, or status changes must not restart it. A deterministic fallback name also counts as an automatic apply. Regeneration producing the same visible name updates completed context but does not start a cosmetic replay. Initial/resumed names are painted settled, not replayed from persisted provenance.

Clip and measure endpoint text before styling; reserve the greater old/new endpoint display width for the transition, respecting the current footer name budget and existing path/PR truncation policy. Keep separators, PR hyperlinks, usage/model rows, and layout unaffected by frame styling. Resize recalculates clipping without resetting phase. Completion returns ordinary dim rendering and releases animation scheduling. A newer automatic name replaces the previous transition; manual rename, session replacement, presenter deactivation, or disposal cancels the old transition. Reactivation paints the current authoritative name without replay. Manual renames remain immediate.

Terminal OSC titles and session-selector labels always use the complete persisted name immediately; animation is ephemeral footer presentation only, never persisted partial names or a series of metadata changes. No animation runs in `a1 pi`.

## Validation plan

- Feature tests: normalization, retries/budgets/deadlines/fallback, cancellation without fallback, one request per context, delayed projection, latest-prompt selection, and coalesced transitions.
- Lifecycle tests: idempotent relink, different-worktree switch, clear/re-enter same path between reads, legacy revision stability, heartbeat stability, failed links, and unavailable reads without fake transitions.
- Adapter tests: bounded tool-free isolated completion, metadata persistence/reload, unknown-provenance preservation, same-text manual rename ownership, conditional application, and stale context/session rejection.
- Composition tests: first-prompt timing, next-prompt regeneration after exit/re-entry, no naming for comparison/disabled mode, resume behavior, cancellation/disposal, and existing authoritative view/title propagation without a second title channel.
- UI frame/footer/presenter tests: secondary-accent phase boundaries and live color changes, first-generation and regeneration reveals, fallback reveal, no same-name or resume replay, duplicate event stability, grapheme/width safety, narrow terminals/PR truncation, palette fallback, resize, superseding/manual changes, and clock cleanup on completion/deactivation/disposal. Assert terminal titles never receive partial animated text.
- Before pushing implementation, run typecheck, only directly affected test files, and strict OpenSpec validation. CI after readiness remains validation authority.

## Trade-offs and scope boundaries

- Next-prompt regeneration intentionally avoids replacing a meaningful task name with a branch-only guess during cleanup. Immediate rename on worktree entry is an alternative requiring approval instead of this policy.
- The old maximum second budget can be expensive on reasoning models; this proposal preserves its compatibility rather than silently choosing a cheaper provider or an insufficient output ceiling.
- Automatic names from pre-pivot sessions cannot be reliably distinguished from manual names. Preserve them unless future explicit takeover UX is separately approved.
- Topic changes with no worktree/branch transition do not rename an already named session in this scope. Semantic topic detection, terminal-title animations, and a manual regeneration command are excluded. The automatic status-bar name reveal is included.

## Delivery

Planning-only draft PR first; implementation stays in the same worktree, branch, history, and PR after approval. No implementation code, tests, settings, or canonical spec synchronization are part of this planning commit.
