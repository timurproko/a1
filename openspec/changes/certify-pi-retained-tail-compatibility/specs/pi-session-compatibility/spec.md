## Purpose

Defines lossless restoration of persisted Pi compaction checkpoints and explicit compatibility failures so A1 never continues a conversation with silently omitted retained context.

## Scope

This is the contract for the deferred additional retained-tail capability, not a claim about the current pin or a prerequisite for the ordinary CLI resume repair. The requirements remain acceptance gates for that independent capability if its implementation is requested. `fix-cli-session-resume` instead verifies future sessions against its pinned Pi's actual behavior and does not implement this capability or its rejection subsystem.

## ADDED Requirements

### Requirement: A retained checkpoint restores its materialized message tail
For a valid active compaction checkpoint containing `retainedTail`, A1 SHALL restore the checkpoint summary followed by every retained message in stored order and then messages after that checkpoint on the active branch. The retained tail SHALL be authoritative even when the same entry also contains a legacy `firstKeptEntryId`. A1 SHALL neither add pre-checkpoint messages through the legacy pointer nor deduplicate intentionally repeated retained messages. Message roles, ordered content blocks, tool-call associations, and supported message metadata SHALL retain their persisted meaning.

#### Scenario: Restore a retained-tail-only checkpoint
- **WHEN** a selected valid session contains a checkpoint whose retained user/assistant messages have no separate tree entries and a later assistant message
- **THEN** restored context SHALL contain the summary, retained messages, and later assistant message in that order without omission or duplication

#### Scenario: Explicitly empty retained tail
- **WHEN** the active checkpoint contains `retainedTail: []` and also a legacy pointer to earlier messages
- **THEN** restored context SHALL contain the summary and active post-checkpoint messages only, with no fallback to the legacy pointer

#### Scenario: Mixed retained message content
- **WHEN** the retained tail includes a user message with text and image content, assistant thinking/text/tool calls, a corresponding tool result, and a supported custom message
- **THEN** restoration SHALL preserve their roles, content ordering, call/result associations, and metadata without executing a stored tool call or initiating a model request

### Requirement: Checkpoint restoration respects branch and legacy semantics
Only the latest compaction checkpoint on the selected branch SHALL determine retained context. If that checkpoint has no `retainedTail` field, A1 SHALL preserve the accepted legacy `firstKeptEntryId` behavior. A branch with no compaction SHALL retain ordinary tree-based context. Model and thinking settings SHALL continue to derive from the selected branch under the normal Pi restoration and model-fallback rules, not from unrelated branches or solely from the materialized tail.

#### Scenario: Latest checkpoint supersedes an earlier one
- **WHEN** the active branch contains multiple checkpoints
- **THEN** restoration SHALL use only the latest checkpoint's retained context plus its active descendants

#### Scenario: Compaction is on another branch
- **WHEN** a retained checkpoint exists only on an unselected branch
- **THEN** it SHALL NOT contribute its summary or messages to the selected branch's context

#### Scenario: Legacy checkpoint lacks a retained tail
- **WHEN** the selected checkpoint contains only `firstKeptEntryId`
- **THEN** A1 SHALL restore the legacy retained entry range and later messages without changing its ordering or saved model/thinking semantics

### Requirement: Engine context and owned presentation restore the same retained conversation
Initial open, session replacement, in-place tree navigation, and fork/clone restoration SHALL consistently honor retained checkpoints. The owned transcript SHALL expose the restored displayable retained messages without hiding messages that exist only inside the checkpoint or synthesizing duplicate persisted tree entries. Existing visibility policies for thinking, tools, custom messages, and non-message entries SHALL still apply. Successful direct reopening of an already valid v3 file SHALL preserve its session ID, file path, and stored bytes; compatibility restoration alone SHALL NOT rewrite or convert that file.

#### Scenario: Reopen and replace an active session
- **WHEN** a retained-tail session is opened initially or selected through session replacement
- **THEN** both the engine context and owned transcript SHALL reflect its restored retained messages before a new prompt is accepted

#### Scenario: Navigate a retained branch or clone it
- **WHEN** the user navigates to a branch containing a retained checkpoint or creates an explicit fork/clone from it
- **THEN** the resulting active context and displayable transcript SHALL preserve the applicable retained messages, while the original source session remains unmodified by compatibility processing

#### Scenario: Reopen a valid v3 session without interaction
- **WHEN** compatibility restoration opens and closes a valid v3 retained-tail file without a user mutation
- **THEN** the original session identity, path, and bytes SHALL remain unchanged

### Requirement: Unsupported or malformed retained history fails before use
A1 SHALL reject a retained checkpoint that is not supported by the selected runtime or whose retained payload fails the supported message-shape contract, before accepting a prompt or executing tools with that context. Diagnostics SHALL identify the incompatible session capability and operation without echoing private message bodies. Malformed presence, including `null` or a non-array value, SHALL NOT be treated as field absence or an empty tail. Failure SHALL preserve the session file and SHALL NOT silently downgrade to summary-only or legacy-pointer context. At a session replacement boundary, rejection SHALL preserve the previously usable session when the existing transactional replacement contract permits it.

#### Scenario: Runtime drops retained messages
- **WHEN** the selected runtime cannot reconstruct a valid retained checkpoint faithfully
- **THEN** A1 SHALL report retained-checkpoint incompatibility and SHALL NOT claim that the conversation was restored successfully or send a prompt using the incomplete context

#### Scenario: Malformed retained payload
- **WHEN** a checkpoint has a present but non-array tail or an invalid retained message shape
- **THEN** A1 SHALL report an invalid retained checkpoint before conversation use without modifying its file, discarding the field, or exposing its private contents in the diagnostic

#### Scenario: Replacement fails validation
- **WHEN** an active usable session is replaced with an incompatible retained-tail target
- **THEN** the target SHALL not become a usable conversation and the current session SHALL remain usable under the existing replacement failure contract
