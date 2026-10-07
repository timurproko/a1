## Context

See `proposal.md` for motivation and `specs/contextual-prompt-suggestions/spec.md` for the behavioral delta. The current predictor appends one instruction to the same transformed conversation, tool declaration, model, session identity, and thinking configuration as the primary request so providers can reuse the prompt cache. It makes one request, rejects tool-call responses, normalizes returned text, and records only metadata outcomes.

The existing instruction names archive closeout but not the reported formal plan-approval/implementation handoff. It says to return a short response but does not explicitly prohibit tool calls, even though the cache-compatible request intentionally retains the primary tool declarations. The normalizer also rejects unlisted one-word responses; common predictions such as `approved` or `proceed` can therefore produce a diagnosed rejection rather than visible ghost text. Without enabled diagnostics, the screenshot alone cannot establish which path occurred.

## Goals / Non-Goals

**Goals:**
- Make a clear, intent-compatible formal approval/action handoff a first-class prediction case.
- Reduce avoidable tool-call and one-word-filter misses while preserving one request and the primary request's cache-compatible shape.
- Prove positive approval/implementation behavior and negative required-validation/unresolved-choice behavior through sanitized fixtures.
- Preserve inert ghost text, separate Tab acceptance and Enter submission, typed diagnostics, and private transcript boundaries.

**Non-Goals:**
- Guarantee a suggestion on every eligible turn or reinterpret an actual provider timeout/failure as a candidate.
- Parse quoted assistant wording into a deterministic fallback, infer approval without the model, or execute tools/actions.
- Retry, switch models, lower thinking, remove tools from the request, or change the 15-second deadline.
- Change eligibility thresholds, editor presentation, settings, persistence, `a1 pi`, or OpenSpec approval rules.

## Decisions

### 1. Add a formal approval/action regression case to generic prediction guidance

Create a sanitized multi-turn fixture in which recent user intent supports proceeding and the final assistant asks for formal plan approval plus an explicit implementation request. Amend the instruction to identify a single concrete, intent-compatible authorization/action request as a strong signal and to avoid abstaining merely because the action is consequential or formally governed.

Keep the rule contextual. Required validation, contradictory intent, and equally unresolved alternatives remain negative cases. The fixture may resemble the reported state semantically but will contain no screenshot, repository, pull request, branch, or session identifiers.

**Alternative rejected:** extracting text after `approve`, `say`, or similar wording. Extraction can manufacture authorization when prior context conflicts and would conceal empty/provider-failure outcomes.

### 2. Explicitly prohibit tool calls in the appended instruction

Tell the model that this isolated turn predicts user text and must not call tools. Continue sending the unchanged primary tool declarations because they are part of the cache-compatible request prefix and the canonical parity contract. Continue rejecting any returned tool call and do not retry it.

**Alternative rejected:** removing tools, changing tool choice, or using a separate low-effort request. Those options change the provider-visible request shape and can forfeit the prompt-cache continuity restored by the existing design.

### 3. Expand only the bounded single-word allowlist

Add exact common approval/action words: `approved`, `proceed`, `implement`, `merge`, and `archive`. They remain subject to all length, control-character, markup, assistant-voice, error, and pleasantry rejection rules. They receive no special lifecycle authority: each is invisible to semantic editor state until Tab and cannot run until a separate submit action.

Do not broadly accept every one-word token. Exact allowlisting keeps accidental labels, names, fragments, and model meta-output rejected.

**Alternative rejected:** requiring every action to contain two words. Concise one-word replies are natural in the reported workflow and the existing contract already permits established one-word actions.

### 4. Separate deterministic contract evidence from provider-quality evidence

Adapter/contract tests will inspect the revised instruction, ensure the complete final response is present, verify tool-call results remain rejected, and cover all newly allowed words plus retained rejection rules. Controller/shell coverage will publish representative `approved implement it` and `proceed` results before and after settlement and verify they remain inert until accepted and submitted.

Extend the credential-gated probe to include the sanitized formal-approval positive case and a required-validation negative case, reporting only outcome/latency summaries. The probe remains skipped by default and must not run without explicit quota authorization. If unavailable, deterministic correctness can complete while real-provider quality remains an explicit known gap for handoff rather than a fabricated guarantee.

## Risks / Trade-offs

- **[The model can still abstain or time out]** → Preserve honest empty/timeout diagnostics and describe this as improved guidance, not guaranteed generation.
- **[Stronger wording could suggest approval despite a blocker]** → Retain required-validation, contradictory-intent, and unresolved-choice counterexamples in both instruction and tests.
- **[Tool declarations may still attract a tool call]** → Explicitly prohibit calls, reject any call, and keep no-retry/no-execution behavior.
- **[Additional one-word actions are consequential]** → Keep them inert ghost text requiring separate acceptance and submission.
- **[A provider smoke test consumes quota]** → Keep it opt-in, bounded, metadata-only, and require explicit authorization before execution.

## Migration Plan

No data, settings, or session migration is required. Implement the instruction, allowlist, fixtures, focused tests, provider probe, and architecture note in the existing boundaries. Rollback is an ordinary code revert; users can disable prompt suggestions independently at any time.
