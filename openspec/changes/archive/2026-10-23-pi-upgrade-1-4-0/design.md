# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the sync report comment, and the pull request's generated implementation outcomes are checked as the reviewer completes them.

## Sync report at proposal

- Vendored copies: 0 merged cleanly; 0 with conflict markers to resolve; 31 unchanged upstream; 0 kept as A1's version.
- Inventories: 0 anchors rewritten, 17 behavior ranges moved, 5 entries orphaned (extension.overlay, extension.overlay.open, extension.select.close, extension.input.close, extension.editor.close), 0 components unmapped.
- Public API: 0 exports added, 0 removed (0 consumed by A1), 7 changed (3 consumed by A1).
  - changed class `AgentSession` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/engine/adapter.ts, src/integrations/pi/engine/compaction-progress.ts, src/integrations/pi/engine/extension-ui-binding.ts, src/integrations/pi/engine/ports.ts, src/integrations/pi/engine/prompt-suggestions.ts, src/integrations/pi/engine/provider-authentication.ts, src/integrations/pi/engine/resource-catalog.ts, src/integrations/pi/engine/runtime-integration.ts, src/integrations/pi/engine/session-integration.ts, src/integrations/pi/engine/session-runtime.ts, src/integrations/pi/engine/settings-port.ts, src/integrations/pi/engine/usage-view.ts, src/integrations/pi/engine/workflow-contexts.ts, src/integrations/pi/engine/workflow-runner.ts
  - changed class `ProcessTerminal` (@earendil-works/pi-tui); consumers: src/integrations/pi/tui-runtime/adapter.ts
  - changed class `TuiAltScreen` (@earendil-works/pi-tui); consumers: src/integrations/pi/tui-runtime/adapter.ts, src/integrations/pi/tui-runtime/overlay-geometry.ts
  - not consumed by A1: generateSummary, generateSummaryWithUsage, InteractiveMode, Terminal
- New upstream features awaiting an A1 disposition: 5; rows retired upstream: 0; rows still pending: 5.
  - changelog:1.4.0:image-input-for-classifiers: Image input for classifiers — codemode `models.classify()` accepts `images` for TypeSafe's Jev and Cloudflare's Clef models on `typesafe`, `cloudflare-workers-ai`, and OpenRouter.
  - changelog:1.4.0:models-configuration-reference: Models Configuration reference — every provider, model, model override, and compatibility field of `models.json`, generated from its schema.
  - changelog:1.4.0:summaries-without-a-fixed-output-cap: Summaries without a fixed output cap — compaction and branch summaries use the model's output limit, so long reasoning no longer makes them fail.
  - changelog:1.4.0:codemode-waits-for-a-free-worker: Codemode waits for a free worker — parallel scripts and in-process subagents queue instead of failing, and `PI_CODEMODE_MAX_WORKERS` raises the limit.
  - changelog:1.4.0:rex-terminal-support: Rex terminal support — OSC 8 hyperlinks, truecolor, and inline images.
- Automated gates:
  - pass bump: pinned @earendil-works/pi-coding-agent and @earendil-works/pi-tui at 1.4.0
  - pass evaluator: install, compile, runtime
  - pass install: installed the candidate dependency set
  - FAIL build: file:///home/runner/work/a1/a1/scripts/pi/build-startup-public.mjs:60 if (baselineErrors.length > 0) throw new Error(baselineErrors.join("; ")); ^ Error: Pi startup artifact has 2107 loaded files; maximum is 2101; Pi startup artifact has 10053785 evaluated bytes; maximum is 10025075 at file:///home/runner/work/a1/a1/scripts/pi/build-startup-public.mjs:60:38 Node.js v24.21.0
  - pass merge: 0 clean, 0 conflicted, 31 unchanged, 0 kept
  - pass ledger: source ledger and provenance headers regenerated
  - pass inventories: 0 re-anchored, 17 moved, 5 orphaned, 0 unmapped
  - pass public-api: 0 added, 0 removed, 7 changed
  - pass matrix: 5 new upstream features, 0 retired, 5 pending
  - FAIL startup-graph: Updating crates.io index Downloading crates ... Downloaded convert_case v0.10.0 Downloaded cfg-if v1.0.4 Downloaded anyhow v1.0.104 Downloaded cfg_aliases v0.1.1 Downloaded cpufeatures v0.2.17 Downloaded block-buffer v0.10.4 Downloaded cpufeatures v0.3.1 Downloaded bitflags v2.13.1 Downloaded version_check v0.9.5 Downloaded subtle v2.6.1 Downloaded signal-hook-mio v0.2.5 Downloaded filedescript...
  - FAIL parity: /home/runner/work/a1/a1/src/integrations/pi/engine/settings-metadata.ts:45 throw new Error(`Pi settings metadata is not generated at ${url.href}; run npm run build (${describe(error)})`); ^ Error: Pi settings metadata is not generated at file:///home/runner/work/a1/a1/src/integrations/pi/engine/pi-settings-metadata.json; run npm run build (ENOENT: no such file or directory, open '/home/runner/w...
  - pass typecheck: clean
  - pass architecture: clean
  - pass engine-conformance: passed
  - FAIL parity-suites: Validation phase failure evidence could not be written. [31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 12 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m [41m[1m FAIL [22m[49m test/repository-governance/damage-aware-terminal-boundary.test.ts[2m > [22mdamage-aware terminal public boundary[2m > [22mpins conformance to the installed public Pi package identity [31m[1mAssertionError[22m: expected '@earendil-works/pi...
- Review items:
  - inventory entry extension.overlay: source anchor no longer exists (orphaned)
  - inventory entry extension.overlay.open: source anchor no longer exists (orphaned)
  - inventory entry extension.select.close: source anchor no longer exists (orphaned)
  - inventory entry extension.input.close: source anchor no longer exists (orphaned)
  - inventory entry extension.editor.close: source anchor no longer exists (orphaned)
  - public API @earendil-works/pi-coding-agent changed class AgentSession; adopt in src/integrations/pi/engine/adapter.ts, src/integrations/pi/engine/compaction-progress.ts, src/integrations/pi/engine/extension-ui-binding.ts, src/integrations/pi/engine/ports.ts, src/integrations/pi/engine/prompt-suggestions.ts, src/integrations/pi/engine/provider-authentication.ts, src/integrations/pi/engine/resource-catalog.ts, src/integrations/pi/engine/runtime-integration.ts, src/integrations/pi/engine/session-integration.ts, src/integrations/pi/engine/session-runtime.ts, src/integrations/pi/engine/settings-port.ts, src/integrations/pi/engine/usage-view.ts, src/integrations/pi/engine/workflow-contexts.ts, src/integrations/pi/engine/workflow-runner.ts
  - public API @earendil-works/pi-tui changed class ProcessTerminal; adopt in src/integrations/pi/tui-runtime/adapter.ts
  - public API @earendil-works/pi-tui changed class TuiAltScreen; adopt in src/integrations/pi/tui-runtime/adapter.ts, src/integrations/pi/tui-runtime/overlay-geometry.ts
  - 5 feature matrix rows are pending a disposition: changelog:1.4.0:codemode-waits-for-a-free-worker, changelog:1.4.0:image-input-for-classifiers, changelog:1.4.0:models-configuration-reference, changelog:1.4.0:rex-terminal-support, changelog:1.4.0:summaries-without-a-fixed-output-cap
  - 22 files still mention 1.3.0 or 71023ae: config/baselines/pi-feature-adoption-matrix.json, config/baselines/pi-parity-acceptance.json, config/baselines/pi-session-shell-provenance.json, config/baselines/pinned-pi-command-workflow-outcomes.json, config/baselines/pinned-pi-public-api.json, config/product-identity-legacy-allowlist.json, scripts/governance/check-deprecated-dependencies.mjs, src/integrations/pi/components/resources/builtin-themes.ts, src/integrations/pi/components/upstream/assets/earendil-image.json, src/integrations/pi/engine/resources/changelog.json, src/integrations/pi/tui-runtime/damage-aware-terminal.ts, src/ui/components/text.ts, ...

## Reviewed 1.4.0 decisions

No vendored copy conflicted. The sync re-pinned the Pi startup artifact totals to the 1.4 measurement, so the build gate passes; the startup-graph, parity, and parity-suites failures cascaded from that first build failure and pass on the regenerated candidate. The owned startup-graph source budget is re-pinned to include the adopted dialog stack and exit-restore binding below, and the extension bridge's size-ratchet entry is lowered after the stack moved into its own helper.

Pi 1.4 stacks extension dialogs: a second `select`, `confirm`, `input`, `editor`, or inline `custom()` dialog hides the visible one instead of replacing it, every covered dialog stays answerable, and closing the visible dialog shows the previous one with its program status. A1's extension UI bridge adopts that stack, so a confirm opened from inside a custom component or from a concurrent extension now works and no earlier dialog promise is left pending. Settled select, input, and inline custom dialogs are disposed as in pinned Pi, which also stops a timed dialog's countdown. A1 keeps one deliberate difference: a session reset settles every stacked dialog as cancelled, top first, where pinned Pi drops them unresolved. The five orphaned modal-inventory entries are re-anchored to the 1.4 dialog stack and overlay source, and the extension open and close transitions now describe stack restoration.

The changed `ProcessTerminal`, `TuiAltScreen`, and `Terminal` declarations add Pi TUI's last-resort exit restore, which resets terminal modes from a process `exit` handler when `stop()` did not run. A1's terminal port declares the optional `restoreOnExit`, and the runtime adapter binds it on the terminal it hands to Pi TUI straight to the undecorated terminal, so the damage-aware, diagnostic, input-coordination, and frozen-presentation decorators neither need to forward it nor can swallow it. The alternate-screen render path is unchanged, so the damage grammar identity moves to 1.4 without a grammar change. The changed `AgentSession` declaration only alters private recovery state; A1's public session adapters need no change.

A1 owns its native clipboard writer, so it adopts Pi 1.4's POSIX fix directly: `wl-copy`, `xclip`, and `pbcopy` writers run detached from A1's process group, and a clipboard daemon keeps serving after Ctrl+Z suspends A1.

All five new features stay `pinned`. Codemode worker queuing and `PI_CODEMODE_MAX_WORKERS`, classifier image input, and summaries without a fixed output cap come from the pinned codemode extension, model runtime, and `AgentSession` that A1 uses through public APIs. The generated Models Configuration reference ships in the pinned package and describes the `models.json` A1 reads through Pi's model registry. Rex detection comes from public `getCapabilities`, and A1 does not use Kitty Unicode placeholders.

## User-visible changes

Behavior follows Pi 1.4: concurrent or nested extension dialogs stack and all settle; a direct `process.exit()` no longer leaves mouse, focus, Kitty keyboard, or alternate-screen modes enabled; compaction and branch summaries no longer fail on long reasoning, and `/compact <instructions>` keeps the instructions when compaction splits a turn; codemode scripts wait up to 60 seconds for a free worker; resumed sessions and `/tree` navigation activate extension tools registered after the branch recorded its loadout; sessions recover after a response cut off at the output limit; Markdown tables survive an unclosed `$$` block and bold or italic renders next to CJK punctuation; `@` file autocomplete accepts regex metacharacters; and Rex gets hyperlinks, truecolor, and inline images. Provider defaults change for GitHub Copilot (`gpt-6.1-sol`), NVIDIA, and Xiaomi, and copied text stays pasteable on Linux after Ctrl+Z.
