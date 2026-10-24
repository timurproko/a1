# Persistent prompt history

Bare A1 recalls recent prompts within each agent session, including when that
session resumes. The optional Shared scope recalls prompts across agent sessions
and projects in the same A1 profile. It is input recall, not conversation recovery or agent memory. The Pi
comparison (`a1 pi`) retains its ordinary current-session history.

## Recall

Use Up/Down at the editor's normal history boundaries. Up enters older prompts
with the caret at the end; Down enters newer prompts at the beginning. Moving
past the newest restores your draft, including its cursor and live pasted text.
Multiline cursor movement and autocomplete keep their existing priority.

The existing editor border shows `History 100/100` for the newest of 100 entries
and `History 1/100` for the oldest. The label uses the status bar's neutral grey
(`dim` theme role), independently of the thinking/bash colors on the input bars. Repeated prompts move forward instead of
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
| Windows | `%USERPROFILE%/.a1/data/history/<history-id>.sqlite3` |
| Linux and macOS | `~/.a1/data/history/<history-id>.sqlite3` |
| Explicit override | `<A1_DATA_DIR>/history/<history-id>.sqlite3` |

The default uses A1's effective profile home: `A1_PROFILE_HOME` when set, otherwise
the operating-system home. A custom agent-profile directory changes the history
identity, not this default root. `A1_DATA_DIR` takes precedence for storage;
`XDG_DATA_HOME` does not redirect default history. Control metadata, settings,
agent resources, releases, logs, runtime files, and caches keep their existing
locations. For repository-local `./scripts/dev` launches, history uses a stable
checkout-wide data root so two independent solo instances share the selected
Shared database, while control and runtime data remain isolated per launch.
The development-only `A1_DEV_HISTORY_DATA_DIR` selects that root; an explicit
`A1_DATA_DIR` still overrides its launcher default. Existing histories in old
per-instance development roots are not moved or combined.

**The home-based default starts fresh.** Previous versions used
`%LOCALAPPDATA%/a1/history` on Windows, or `$XDG_DATA_HOME/a1/history` /
`~/.local/share/a1/history` on Unix. A1 does not probe, import, merge, delete, or
fall back to those stores. Explicit `A1_DATA_DIR` selections still work normally.
Old and new releases using different roots do not synchronize history.

In Shared mode the filename is the original `a1-` SHA-256 profile identity,
independent of project, session, checkout, and release. In Unique mode (the
default), a domain-separated digest also includes the stable conversation session
ID; two solo launches or resident tabs therefore use different databases and
image sidecars. Resuming the same session reuses its store; starting or forking a
session selects a different one. Windows ordinary case and separator variants
normalize together. Moving a profile, unresolved symlink aliases, or selecting a
different data root can select a different history; A1 never silently merges or
imports it.

The database is separate from `control.sqlite3`, agent resources, and disposable
caches. Upgrades, ordinary npm uninstall/reinstall, release rollback, cache cleanup,
and conversation deletion do not clear it. Reusing saved history requires the
same profile and history root; explicitly deleting user data still removes it.
SQLite may keep `-wal` and `-shm` sidecars beside the database.

**History is unencrypted potentially sensitive user text.** Owner permissions
are restricted where supported; Windows uses inherited ACLs at the selected
history directory. Review parent-directory permissions if you customize your home
or override root. These protections do not make it safe to submit secrets.
Credential files, image data, arbitrary environment values, assistant/tool output, and terminal
streams are not copied into this store. Prompt content and private provenance
must not appear in history diagnostics or test evidence.

## Settings and limits

The History section in `/settings` provides:

- **Persistent history:** on by default; applies on the next start. Off disables
  storage and durable recall for subsequent launches, not current-session
  recovery. Existing enabled instances keep running until closed.
- **History scope:** Unique (default) keeps each agent session's durable prompts
  separate across solo launches and resident tabs. Shared restores the former
  profile-wide store. Switching applies to running agents, including other solo
  processes and resident tabs, when their shared settings update arrives. New
  prompts use the newly selected store; already-submitted writes finish in their
  original store. Switching never transfers or deletes records, and it preserves
  unsent drafts. Existing profiles without this setting default to Unique, so
  old Shared entries remain intact but do not appear until Shared is selected.
- **History limit:** 10-100 in increments of 10, default 100; applies when a new
  enabled instance starts. All writers using that selected store then use its
  updated retention limit. Raising the limit cannot restore pruned entries.

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
Do not delete an open database, the whole `.a1` directory, or the whole
application-data root. Disabling the setting alone is not an erase operation.
There is no interactive clear/export command in this release.

Removing a former default store is likewise a one-time manual cleanup, not an
application feature. Wait until you have switched to the new version and closed
all instances using the old store; an older running version can otherwise keep
using or recreate it. Remove only the identified old profile database and matching
sidecars, not other profiles or either application's caches.

## Manual acceptance

Build the checkout, then launch it through `./scripts/dev`. Use an isolated
`A1_DATA_DIR` for disposable history checks; keep that same directory on each
restart and in both concurrent terminals. The development launcher always sets
an isolated `A1_DATA_DIR`; to try the home-based location in that launcher,
explicitly select `A1_DATA_DIR=<effective-home>/.a1/data` and keep
`A1_DATABASE_PATH` in a separate disposable directory so control metadata is not
placed beside history. For a history-only review, `NODE_DISABLE_COMPILE_CACHE=1`
also avoids creating compile-cache files under that explicitly overridden root.
The focused path/composition tests cover normal no-override selection. Test:

1. Submit two text prompts and one repeated prompt; resume the same session
   after restart and check those prompts remain recallable. Start `/new` and
   confirm its durable history is separate.
2. Browse multiline input with a draft present. Check v2 caret placement,
   newest/oldest numbering, and draft restoration.
3. Submit from a second instance while the first browses. Under Unique, the
   first sees no cross-agent update. Switch to Shared without restarting; once
   both agents apply the setting, the second instance's new prompt appears in
   the first agent's shared history. Switching back restores each Unique store.
4. Recall pasted text after restart; image tokens must not promise reattachment.
5. Save History scope and verify its immediate effective value. Restart only
   for changes to Persistent history or History limit.
6. Use a second isolated effective profile and verify no sharing. Run
   `./scripts/dev pi` and verify its ordinary history/editor remain unchanged.

Source ownership and differential editor evidence are described in
[history-editor-provenance.md](../architecture/history-editor-provenance.md).
