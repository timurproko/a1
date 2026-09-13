# Prompt suggestion reliability

Bare A1 predicts a short next user input with one isolated request using the selected model. A clear offered action consistent with recent user intent, such as `archive it` after accepted merged work, is preferred over abstaining merely because optional testing was also offered. Required validation, conflicting intent, and unresolved choices still allow no suggestion. There is no quoted-text extraction fallback.

## Request and editor boundaries

The adapter resolves the lowest supported effort from the selected session model's available thinking levels, without changing the main thinking setting. Non-reasoning models omit reasoning controls; supported `off` also omits the optional reasoning argument, matching the model runtime's ordinary completion contract. Other supported efforts are supplied explicitly. Missing capabilities produce `unavailable`, not a guessed provider option. Provider mapping/clamping remains owned by the pinned model runtime; the diagnostic policy describes the applied request option, not inferred server-side computation.

The controller retains the 15-second deadline, does not retry or switch models, and retires a timeout before aborting. A provider that ignores abort cannot revive retired text. A timely candidate remains private until matching settlement. Ghost text is not editor content, approval, or a submission: Tab accepts it into the editor, and Enter must be pressed separately to submit it. Typing, session/model replacement, continuation, or disabling suggestions invalidates unaccepted work. `a1 pi` does not install this feature.

## Opt-in local diagnostics

Set `A1_SUGGESTION_DIAGNOSTICS` to a **dedicated writable file** when launching bare A1. It is an explicit snapshot destination, not a log directory. The parent directory must already exist. The selected file is overwritten with the latest bounded snapshot; never select a session, source, credential, or other valuable file. Do not share one destination between running processes.

For a repository checkout in Git Bash:

```sh
npm run build && A1_SUGGESTION_DIAGNOSTICS="$PWD/.artifacts/suggestion-diagnostics.json" ./scripts/dev
```

Create `.artifacts` first if it does not exist. For an installed release, use the same environment assignment before `a1`. The variable follows the ordinary launch environment; it adds no interactive flag, setting, footer row, or transcript message. SDK composition can supply `suggestionDiagnosticsPath` explicitly. Comparison or settings-free compositions ignore both paths.

While that session is running, inspect the selected JSON file using a local editor or:

```sh
node -e 'const fs=require("node:fs"); console.table(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).records)' .artifacts/suggestion-diagnostics.json
```

The `prompt-suggestion-diagnostics-v1` snapshot contains at most 128 metadata records and 64 KiB. Capture is off by default. Records include process-local session/run/response/request numbers, bounded provider/model identifiers, applied reasoning policy, elapsed milliseconds, event, and optional reason. They exclude conversation/candidate text, tool data, raw errors, credentials, and session/worktree paths. There is no upload. Older records are evicted, so a retained terminal event can outlive its evicted start event. `request: 0` means no request was started for that decision.

| Event | Meaning |
| --- | --- |
| `skipped` | No request started; inspect `reason`. |
| `started` | One generator request was initiated; reasoning may be `unavailable` for an injected generator without policy metadata. |
| `displayed` | A current candidate was shown after settlement. |
| `empty` | The provider returned no text; this does not reveal the model's private reason for abstaining. |
| `rejected` | Returned content violated the candidate contract, contained tool calls, was truncated, or had invalid formatting/voice. |
| `provider-failure` | Provider error/rejection; raw error details are intentionally omitted. |
| `unavailable` | Model/runtime/capabilities or request identity were unavailable at the generator boundary. |
| `timeout` | The controller's 15-second deadline expired. |
| `cancelled` | Work was invalidated or aborted, including typing or continuation. |
| `stale-result` | A result or settlement identity did not match its request. |
| `presentation-blocked` | A valid candidate could not be shown; inspect `reason`. |
| `late-result-discarded` | A retired request eventually resolved/rejected; this is not a second terminal outcome or request. |

Eligibility/presentation reasons include `disabled`, `disposed`, `early-conversation`, `no-model`, `failed-response`, `incomplete-response`, `tool-continuation`, `replacement-input`, `modal`, `draft`, `not-ready`, `not-focused`, `autocomplete`, `prompt-mode`, and `stale-identity`. `ineligible` and `presentation-unavailable` cover injected ports without finer metadata. A missing suggestion alone is never evidence of timeout or intentional model abstention.

Writes are asynchronous and coalesced: at most one write and one pending latest snapshot. Sink failures do not affect generation, input, or rendering and do not appear in the UI. An unwritable destination may therefore produce no file; check the destination locally rather than diagnosing the model from that absence. Disposal clears in-memory capture and pending writes; a write already in progress can finish. Exported local files remain until you remove them.

To disable capture, omit/unset `A1_SUGGESTION_DIAGNOSTICS` before the next launch and remove the dedicated snapshot if no longer needed. This does not disable suggestions; `/settings` -> Agent -> Prompt suggestions controls generation independently.

## Verification and evidence limits

The focused tests cover the synthetic archive offer and required-testing/unresolved-choice counterexamples, unchanged primary thinking, typed outcomes, timeout/cancellation races, editor acceptance, and local privacy/bounds:

```sh
npx vitest run test/integrations/pi/session-ui/prompt-suggestion-controller.test.ts test/integrations/pi/engine/adapter.test.ts test/features/prompt-suggestions/diagnostics.test.ts test/contracts/owned-ui/contracts.test.ts test/integrations/pi/session-ui/session-shell.test.ts
```

A separate opt-in probe uses the profile's saved model/authentication with a scratch cwd, in-memory sessions/settings, disabled extensions/skills/prompts, and no tools. It performs five original-policy predictions, five revised-policy predictions, and one required-testing counterexample. This makes **11 provider requests** and can consume quota. Run only with explicit authorization:

```sh
RUN_PROMPT_SUGGESTION_PROVIDER_TEST=1 PROMPT_SUGGESTION_AGENT_DIR="C:/path/to/agent-profile" npx vitest run test/integrations/pi/engine/prompt-suggestion-provider.integration.test.ts
```

The probe reports outcome/latency summaries and archival-candidate counts, not raw text. It requires at least one revised archival continuation and rejects an archival continuation in the required-testing case. Five samples are a smoke comparison, not a statistical reliability guarantee. Missing credentials, model availability, or a successful real archival prediction leave provider acceptance pending; fake tests do not prove model quality.

For manual review, use a harmless synthetic conversation with two assistant responses: establish that an imaginary change was tested, accepted, and merged, then ask for a closeout offer containing `Say archive it` with optional extra testing. Do not ask the agent to perform real archival to test ghost text. Keep main thinking high and the editor untouched while waiting, inspect the outcome snapshot, check Tab/Enter separately, and repeat with typing cancellation and suggestions disabled. Verify required testing is not treated as optional. Real latency, model abstention, and existing context-reconstruction limitations can still leave the editor empty.
