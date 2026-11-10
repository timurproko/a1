# Design

## Proposed by the sync, decided by a reviewer

The upgrade script bumps the pins, evaluates the candidate in isolation, three-way merges each vendored copy that follows upstream (old upstream, new upstream, A1 copy) and records the upstream delta of each copy A1 keeps, regenerates every derived artifact, and runs the gates. It never resolves a conflict, never drops an orphaned inventory entry, never records a feature disposition, and never merges; each of those is a review item in the sync report comment, and the pull request's generated implementation outcomes are checked as the reviewer completes them.

## Sync report at proposal

- Vendored copies: 2 merged cleanly (src/integrations/pi/components/upstream/adjacent/core/keybindings.ts, src/integrations/pi/components/upstream/history/editor-core.ts); 4 with conflict markers to resolve (src/integrations/pi/components/upstream/components/extension-selector.ts, src/integrations/pi/components/upstream/components/mermaid.ts, src/integrations/pi/components/upstream/components/skill-invocation-message.ts, src/integrations/pi/components/upstream/components/tree-selector.ts); 22 unchanged upstream; 2 kept as A1's version (src/integrations/pi/components/upstream/theme/theme.ts: upstream changed, A1 version kept, 4 delta lines; src/integrations/pi/components/upstream/history/text-helpers.ts: upstream changed, A1 version kept, 4 delta lines).
- Inventories: 0 anchors rewritten, 20 behavior ranges moved, 1 entries orphaned (extension.overlay.close), 1 components unmapped (provider-brand.js).
- Public API: 3 exports added, 0 removed (0 consumed by A1), 17 changed (7 consumed by A1).
  - changed class `AgentSession` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/engine/adapter.ts, src/integrations/pi/engine/compaction-progress.ts, src/integrations/pi/engine/extension-ui-binding.ts, src/integrations/pi/engine/ports.ts, src/integrations/pi/engine/prompt-suggestions.ts, src/integrations/pi/engine/provider-authentication.ts, src/integrations/pi/engine/resource-catalog.ts, src/integrations/pi/engine/runtime-integration.ts, src/integrations/pi/engine/session-integration.ts, src/integrations/pi/engine/session-naming.ts, src/integrations/pi/engine/session-runtime.ts, src/integrations/pi/engine/settings-port.ts, src/integrations/pi/engine/view-state.ts, src/integrations/pi/engine/workflow-contexts.ts, src/integrations/pi/engine/workflow-runner.ts, src/integrations/pi/engine/workflow-share.ts
  - changed class `CompactionSummaryMessageComponent` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/components/shell-presenters-transcript.ts, src/integrations/pi/startup-public.ts
  - changed class `CustomMessageComponent` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/components/shell-presenters-transcript.ts, src/integrations/pi/startup-public.ts
  - changed class `DefaultPackageManager` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/engine/package-integration.ts, src/integrations/pi/engine/session-runtime.ts, src/integrations/pi/startup-public.ts
  - changed interface `ExtensionAPI` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/engine/windows-filesystem-hygiene.ts
  - changed class `ModelRuntime` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/engine/conformance.ts, src/integrations/pi/engine/package-integration.ts, src/integrations/pi/startup-public.ts
  - changed class `OAuthSelectorComponent` (@earendil-works/pi-coding-agent); consumers: src/integrations/pi/components/shell-selectors-dialogs.ts, src/integrations/pi/startup-public.ts
  - not consumed by A1: BranchSummaryMessageComponent, CacheWarmingDecision, Extension, GrepOperations, InteractiveMode, MarkdownTransformContext, ProgressEvent, ReadOperations, SkillInvocationMessageComponent, TreeSelectorComponent
- New upstream features awaiting an A1 disposition: 6; rows retired upstream: 0; rows still pending: 6.
  - changelog:1.5.1:shell-login-and-logout: Shell login and logout — use `pi auth login <provider>` and `pi auth logout <provider>` without starting a session, with API-key and no-browser sign-in options.
  - changelog:1.5.1:idle-prompt-cache-warming: Idle prompt cache warming — eligible caches now stay warm for up to 30 minutes between runs when a refresh is expected to pay for itself.
  - changelog:1.5.1:anthropic-message-threads: Anthropic message threads — requests send only new messages while the server continues the conversation, with full-request fallback when earlier context changes.
  - changelog:1.5.1:richer-mermaid-diagrams: Richer Mermaid diagrams — pie charts, author-defined styles, clickable labels on supported terminals, and diagrams in expanded branch and compaction summaries.
  - changelog:1.5.1:github-copilot-classifiers: GitHub Copilot classifiers — call Microsoft-Decision-1 through codemode `models.classify()` for typed decisions and probabilities.
  - changelog:1.5.1:package-update-summaries: Package update summaries — `pi update --extensions` reports each package's npm version or git commit change and distinguishes unchanged, skipped, and warned updates.
- Automated gates:
  - pass bump: pinned @earendil-works/pi-coding-agent and @earendil-works/pi-tui at 1.5.1
  - pass evaluator: install, compile, runtime
  - pass install: installed the candidate dependency set
  - FAIL build: file:///home/runner/work/a1/a1/scripts/pi/build-startup-public.mjs:60 if (baselineErrors.length > 0) throw new Error(baselineErrors.join("; ")); ^ Error: Pi startup artifact has 2193 loaded files; maximum is 2157; Pi startup artifact has 10536131 evaluated bytes; maximum is 10392238 at file:///home/runner/work/a1/a1/scripts/pi/build-startup-public.mjs:60:38 Node.js v24.22.2
  - pass merge: 2 clean, 4 conflicted, 22 unchanged, 2 kept
  - pass ledger: source ledger and provenance headers regenerated
  - pass inventories: 0 re-anchored, 20 moved, 1 orphaned, 1 unmapped
  - pass public-api: 3 added, 0 removed, 17 changed
  - pass matrix: 6 new upstream features, 0 retired, 6 pending
  - BLOCKED startup-graph: conflict markers remain in src/integrations/pi/components/upstream/components/extension-selector.ts, src/integrations/pi/components/upstream/components/mermaid.ts, src/integrations/pi/components/upstream/components/skill-invocation-message.ts, src/integrations/pi/components/upstream/components/tree-selector.ts
  - BLOCKED parity: conflict markers remain in src/integrations/pi/components/upstream/components/extension-selector.ts, src/integrations/pi/components/upstream/components/mermaid.ts, src/integrations/pi/components/upstream/components/skill-invocation-message.ts, src/integrations/pi/components/upstream/components/tree-selector.ts
  - BLOCKED typecheck: conflict markers remain in src/integrations/pi/components/upstream/components/extension-selector.ts, src/integrations/pi/components/upstream/components/mermaid.ts, src/integrations/pi/components/upstream/components/skill-invocation-message.ts, src/integrations/pi/components/upstream/components/tree-selector.ts
  - BLOCKED architecture: conflict markers remain in src/integrations/pi/components/upstream/components/extension-selector.ts, src/integrations/pi/components/upstream/components/mermaid.ts, src/integrations/pi/components/upstream/components/skill-invocation-message.ts, src/integrations/pi/components/upstream/components/tree-selector.ts
  - pass engine-conformance: passed
  - BLOCKED parity-suites: conflict markers remain in src/integrations/pi/components/upstream/components/extension-selector.ts, src/integrations/pi/components/upstream/components/mermaid.ts, src/integrations/pi/components/upstream/components/skill-invocation-message.ts, src/integrations/pi/components/upstream/components/tree-selector.ts
- Review items:
  - src/integrations/pi/components/upstream/components/extension-selector.ts: 1 conflict hunk between A1's deviations and the upstream change
  - src/integrations/pi/components/upstream/components/mermaid.ts: 1 conflict hunk between A1's deviations and the upstream change
  - src/integrations/pi/components/upstream/components/skill-invocation-message.ts: 2 conflict hunks between A1's deviations and the upstream change
  - src/integrations/pi/components/upstream/components/tree-selector.ts: 7 conflict hunks between A1's deviations and the upstream change
  - src/integrations/pi/components/upstream/theme/theme.ts: upstream changed (4 delta lines), A1 version kept; see kept/pi-coding-agent-src-modes-interactive-theme-theme.diff in the artifact for anything worth carrying over
  - src/integrations/pi/components/upstream/history/text-helpers.ts: upstream changed (4 delta lines), A1 version kept; see kept/pi-tui-src-utils.diff in the artifact for anything worth carrying over
  - inventory entry extension.overlay.close: source anchor no longer exists (orphaned)
  - interactive component provider-brand.js: not in the modal transition graph (unmapped)
  - public API @earendil-works/pi-coding-agent changed class AgentSession; adopt in src/integrations/pi/engine/adapter.ts, src/integrations/pi/engine/compaction-progress.ts, src/integrations/pi/engine/extension-ui-binding.ts, src/integrations/pi/engine/ports.ts, src/integrations/pi/engine/prompt-suggestions.ts, src/integrations/pi/engine/provider-authentication.ts, src/integrations/pi/engine/resource-catalog.ts, src/integrations/pi/engine/runtime-integration.ts, src/integrations/pi/engine/session-integration.ts, src/integrations/pi/engine/session-naming.ts, src/integrations/pi/engine/session-runtime.ts, src/integrations/pi/engine/settings-port.ts, src/integrations/pi/engine/view-state.ts, src/integrations/pi/engine/workflow-contexts.ts, src/integrations/pi/engine/workflow-runner.ts, src/integrations/pi/engine/workflow-share.ts
  - public API @earendil-works/pi-coding-agent changed class CompactionSummaryMessageComponent; adopt in src/integrations/pi/components/shell-presenters-transcript.ts, src/integrations/pi/startup-public.ts
  - public API @earendil-works/pi-coding-agent changed class CustomMessageComponent; adopt in src/integrations/pi/components/shell-presenters-transcript.ts, src/integrations/pi/startup-public.ts
  - public API @earendil-works/pi-coding-agent changed class DefaultPackageManager; adopt in src/integrations/pi/engine/package-integration.ts, src/integrations/pi/engine/session-runtime.ts, src/integrations/pi/startup-public.ts
  - public API @earendil-works/pi-coding-agent changed interface ExtensionAPI; adopt in src/integrations/pi/engine/windows-filesystem-hygiene.ts
  - public API @earendil-works/pi-coding-agent changed class ModelRuntime; adopt in src/integrations/pi/engine/conformance.ts, src/integrations/pi/engine/package-integration.ts, src/integrations/pi/startup-public.ts
  - public API @earendil-works/pi-coding-agent changed class OAuthSelectorComponent; adopt in src/integrations/pi/components/shell-selectors-dialogs.ts, src/integrations/pi/startup-public.ts
  - 6 feature matrix rows are pending a disposition: changelog:1.5.1:anthropic-message-threads, changelog:1.5.1:github-copilot-classifiers, changelog:1.5.1:idle-prompt-cache-warming, changelog:1.5.1:package-update-summaries, changelog:1.5.1:richer-mermaid-diagrams, changelog:1.5.1:shell-login-and-logout
  - 27 files still mention 1.5.0 or f9a2636: config/baselines/pi-feature-adoption-matrix.json, config/baselines/pi-parity-acceptance.json, config/baselines/pi-session-shell-provenance.json, config/baselines/pinned-pi-command-workflow-outcomes.json, config/baselines/pinned-pi-public-api.json, config/baselines/pinned-pi-source-port-ledger.json, config/product-identity-legacy-allowlist.json, scripts/development/preview-readme.mjs, scripts/governance/check-deprecated-dependencies.mjs, src/app/session-shell/response-copy-transport.ts, src/app/session-shell/shell-host.ts, src/contracts/presentation/progress-palette.generated.ts, ...
