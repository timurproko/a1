# Manual Acceptance Findings

No credential values or authentication-file contents were read or recorded.

## 2026-08-21: provider status and model consistency

The user confirmed that configured-provider status and visible models were consistent in the repaired owned UI.

## 2026-08-21: development-launch profile sharing

The user then reported that `/logout` during the local A1 acceptance run also logged out the vanilla Pi session used for this conversation.

The acceptance command used `npm start`. Source tracing found that `scripts/start-local.mjs` launched `bin/a1-ui.js` directly for recognized interactive profiles but did not call `prepareInteractiveLaunch`. With no inherited `PI_CODING_AGENT_DIR`, the public Pi runtime used its ordinary `.pi/agent` default. The acceptance A1 UI and vanilla Pi therefore operated on the same local profile file. This was local profile sharing, not evidence that separate `.a1/agent` and `.pi/agent` stores synchronized credentials.

The installed `a1` CLI path already calls `prepareInteractiveLaunch` before bootstrap and remained correctly mapped to `.a1/agent`. The correction makes the direct development path perform the same preparation: owned A1 replaces any inherited Pi profile with `.a1/agent`, sandbox selects `.a1/sandbox`, and vanilla Pi removes the override. Regression coverage executes the actual development launcher with an intentionally shared inherited path and requires all three resulting profile selections to remain distinct.

## 2026-08-21: optional GitHub Copilot domain prompt

The user confirmed provider/model status but reported that selecting GitHub Copilot in untouched Pi proceeded to device-code authentication while repaired A1 immediately displayed `Login cancelled`.

Pinned Pi returns the exact authentication prompt value. GitHub Copilot intentionally accepts an empty response to its `GitHub Enterprise URL/domain (blank for github.com)` prompt. The owned shell incorrectly normalized a blank string to `null`, which the engine adapter correctly interpreted as cancellation. The correction preserves an intentionally blank response and reserves `null` for actual cancellation. A synthetic device-code regression uses no live URL, device code, or credential.

## Final acceptance

After both corrections were integrated, the user manually retested the repaired A1 login flow and confirmed it was working. Combined with the earlier confirmation that provider status and visible models were consistent, this closes the required user-controlled acceptance without recording credentials, device codes, or tokens.
