# Session names

Bare A1 automatically names an unnamed session from its current task while the agent works. Names prefer two or three descriptive words, with a maximum of three words and 32 characters including separators. The active model receives the current prompt, verified worktree/branch hints, and bounded relevant recent discussion in a separate tool-free request. Short approvals such as `ok do it` refer back to the concrete task, producing names such as `Spinner style settings` rather than `Implement task`. Images, tool output, thinking blocks, and pasted-image paths are not naming subjects.

The request does not add a conversation turn or delay the main response. It makes at most two attempts, with 30-second deadlines and respective 4,096/32,768 token ceilings. Failed, empty, generic, or attachment-path results use a deterministic fallback from meaningful task words or current branch hints; when no usable task words exist, the fallback is `New task` in the default format.

**Automatic session name** in the Agent settings group is enabled by default. Turning it off cancels pending naming without deleting the current name. The `a1 pi` comparison profile does not receive automatic naming or the A1 footer layout/reveal.

## Name format

Choose **Session name format** in Agent settings:

| Choice | Example |
| --- | --- |
| **Sentence case** (default, first choice) | `Fix API cache` |
| **Kebab case** | `fix-api-cache` |
| **Title Case** | `Fix API Cache` |

Sentence case capitalizes the first word; Title Case capitalizes every ordinary word. Both preserve acronyms and technical spellings supplied by the model, such as `API` and `GitHub`. The same format applies to contextual fallback, and all formats enforce the three-word/32-character limits, trimming at a word boundary where possible. Valid saved format choices are preserved; only missing or invalid values use Sentence case.

The choice is saved to your A1 profile and applies live to future automatic naming, including context regeneration and pending results. Changing it does not rewrite an existing name or start another naming request. Manual `/name` values remain untouched.

## Task-context changes

Linking a different worktree, clearing and re-entering the same worktree, or changing its confirmed branch makes an automatic name eligible for regeneration. A durable association revision detects exit/re-entry even between footer refreshes. Repeating a link without leaving, runtime heartbeats, commits, dirty files, and PR-check updates do not trigger regeneration.

The old name stays visible until the **next user prompt** starts a run in the new context. That prompt, bounded worktree/branch hints, and relevant recent task discussion determine the replacement. A short approval can use discussion matching the new task, but unrelated original prompts and old tasks are excluded. Worktree changes during a running turn wait for another prompt. Naming provenance and the completed context survive restart/resume, so resuming unchanged work does not rename it.

Manual `/name` renames always win, including a manual rename to the same text as an automatic name. Existing named sessions without A1 automatic-name provenance are preserved. Automatic generation cannot overwrite a manual rename or apply to a different session/context after a late provider response.

## Footer and animation

- The first footer row shows the path, branch, and optional linked PR number.
- The second row shows stats/context, then ` • session-name`, with the model/thinking text still aligned right.
- If space is tight, detailed stats are trimmed first to preserve the full name beside the model/thinking segment. Optional provider/route text can be omitted; the name is clipped only if it still cannot fit after stats are reduced. Unnamed sessions and rows without stats have no dangling separator.

A changed automatic name reveals in the configured accent's **secondary color**: 600 ms tonal shimmer over the old name, 45 ms per grapheme to reveal the replacement, then 300 ms fade to ordinary dim text. Palette terminals use a plain typewriter reveal. Live accent changes recolor active frames without restarting them. Repeated redraws, resume, and an unchanged regenerated name do not replay the animation; manual names change immediately.

Only footer presentation animates. The saved name, terminal title, and session selector always receive the complete name immediately. The animation clock stops on completion, manual rename, session replacement, deactivation, and disposal.
