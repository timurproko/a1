# Persistent prompt history

Bare A1 recalls recent prompts across sessions and projects within the same A1
profile. It is input recall, not conversation recovery or agent memory. The Pi
comparison (`a1 pi`) retains its ordinary current-session history.

## Recall

Use Up/Down at the editor's normal history boundaries. Up enters older prompts
with the caret at the end; Down enters newer prompts at the beginning. Moving
past the newest restores your draft, including its cursor and live pasted text.
Multiline cursor movement and autocomplete keep their existing priority.

The existing editor border shows `History 100/100` for the newest of 100 entries
and `History 1/100` for the oldest. Repeated prompts move forward instead of
creating duplicates. Other instances refresh in the background; the selected
history and its count stay fixed until you leave that browse cycle. An
extension-provided custom editor keeps its own behavior; the default editor is
resynchronized when restored.

Ordinary prompts, steering, follow-ups, queued inputs, nonempty bash commands,
and user-entered skill/template/extension prompt routes are eligible. Opening
settings or session/workflow screens does not add history. Loading a transcript,
retrying a dispatch internally, draining a queue, or displaying a suggestion does
not create another entry. An explicit user submission is retained even if the
provider later rejects it or the turn is interrupted.

Text pastes, URL targets, and file paths remain reusable after restart. History
keeps the user invocation before template/extension expansion, not the expanded
request. Image-bearing prompts retain only their text; images are not reattached.
Image-only prompts do not create saved entries. No v2, Pi, or Claude history is
imported automatically.

## Storage and privacy

| Platform | Default durable location |
|---|---|
| Windows | `%LOCALAPPDATA%/a1/history/<profile-id>.sqlite3` |
| Current Unix policy (including macOS) | `$XDG_DATA_HOME/a1/history/<profile-id>.sqlite3`, or `~/.local/share/a1/history/<profile-id>.sqlite3` |
| Explicit override | `<A1_DATA_DIR>/history/<profile-id>.sqlite3` |

The profile filename is `a1-` followed by a SHA-256 digest of a versioned tuple
containing the launch kind and normalized effective agent-profile path. It is
independent of project, session, checkout, and release. Windows ordinary case and
separator variants normalize together. Different profile roots use different
files. Moving a profile, unresolved symlink aliases, or selecting a different
data root can select a different history; A1 never silently merges or imports it.

The database is separate from `control.sqlite3`, agent resources, and disposable
caches. Upgrades, release rollback, cache cleanup, and conversation deletion do
not clear it. SQLite may keep `-wal` and `-shm` sidecars beside the database.

**History is unencrypted potentially sensitive user text.** Owner permissions
are restricted where supported; Windows uses the account's application-data
ACLs. These protections do not make it safe to submit secrets. Credential files,
image data, arbitrary environment values, assistant/tool output, and terminal
streams are not copied into this store. Prompt content and private provenance
must not appear in history diagnostics or test evidence.

## Settings and limits

The History section in `/settings` provides:

- **Persistent history:** on by default; applies on the next start. Off disables
  storage and cross-session recall for subsequent launches, not current-session
  recovery. Existing enabled instances keep running until closed.
- **History limit:** 10-100 in increments of 10, default 100; applies when a new
  enabled instance starts. All writers then use that profile store's updated
  retention limit. Raising the limit cannot restore pruned entries.

The settings use A1's existing settings document, not Pi's settings or a separate
history configuration file. Disabling persistence does not delete saved data;
re-enabling makes compatible retained entries available again.

Additional bounds protect memory and disk:

- At most 1 MiB UTF-8 per persisted prompt, never silently truncated.
- At most 8 MiB retained canonical text, evicting oldest entries even below the
  configured count.
- At most 32 queued/in-flight writes and 8 MiB queued text per instance.
- Provenance: up to 8 KiB cwd and 256 bytes session identity; oversized optional
  provenance is omitted.
- Short off-thread transactions, a one-second lock retry window, and coalesced
  refresh with at most one read in flight.
- SQLite page/journal limits and a 64 MiB database/sidecar maintenance threshold;
  text limits exclude transient SQLite overhead.

Persistence failure leaves prompt execution and local recall usable. A corrupt,
wrong-profile, or newer-schema database is preserved, not silently recreated.
A committed entry survives restart. A hard kill before asynchronous commit can
lose the newest queued entries. Graceful exit attempts to drain writes within
two seconds and reports an incomplete flush without preventing exit.

## Remove saved history

First close **every instance using the selected profile**. Then remove only that
profile's `.sqlite3` file and its matching `-wal` and `-shm` sidecars, if present.
Do not delete an open database or the whole application-data root. Disabling the
setting alone is not an erase operation. There is no interactive clear/export
command in this release.

## Manual acceptance

Build the checkout, then launch it through `./scripts/dev`. Use an isolated
`A1_DATA_DIR` for disposable history checks; keep that same directory on each
restart and in both concurrent terminals. Test:

1. Submit two text prompts and one repeated prompt; start `/new`, then restart.
   The latest unique prompts remain recallable.
2. Browse multiline input with a draft present. Check v2 caret placement,
   newest/oldest numbering, and draft restoration.
3. Submit from a second instance while the first browses. The first selection
   stays fixed; the update appears on a later safe browse cycle.
4. Recall pasted text after restart; image tokens must not promise reattachment.
5. Save both History settings, restart, and verify effective values and opt-out.
6. Use a second isolated effective profile and verify no sharing. Run
   `./scripts/dev pi` and verify its ordinary history/editor remain unchanged.

Source ownership and differential editor evidence are described in
[history-editor-provenance.md](../architecture/history-editor-provenance.md).
