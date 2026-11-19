## Image limit message

Today every `image-count` error ends with "To change the limit /settings.". In bare A1, `/settings` is not a
command (`OWNED_BUILTIN_SLASH_COMMANDS` drops it and `#slashCommand` treats it as application-only), and the limit
is the `promptImageLimit` setting, labelled **Prompt image limit**, in the **Agent** section of Settings, which is
opened from the Launcher (**Ctrl+P → Settings**, the same wording `docs/features/prompt-history.md` uses).

Decision:

| Where | New message |
| --- | --- |
| Bare A1 (limit comes from the setting) | `A prompt is limited to 8 images. To change it: Ctrl+P → Settings → Agent → Prompt image limit.` |
| No configurable limit (Pi-compatible shells, final command admission without a setting) | `A prompt is limited to 8 images.` |

`ImageAttachmentError` gains an optional flag saying the limit is configurable; it defaults to false, so the hint
appears only when `PromptChipStore` was given the settings-driven `imageLimit` (bare A1 only, see
`bareShellPorts` in `src/composition/owned-ui.ts`). Singular/plural wording, error code, warning kind and the
recorded `imageLimit` are unchanged.

## Session open in another process

`openSelectedPiSession` catches `SessionWriterConflict` and calls the fork prompt with `{ sourceCwd: cwd }`, so the
console prompt prints "Session found in different project: <current folder>". The session is not in another
project; another A1 process holds its writer lock.

Decision: the fork-prompt request gains an optional `reason: "open-elsewhere"`. With it, the console prompt prints
`Session is open in another A1 process.` followed by the existing `Fork this session into current directory? [y/N]`
question. Answers, the cancellation path and the final "session is open in another A1 process" error are
unchanged. The cross-project and missing-folder prompts keep their current text.

## Prompt-history border counter

`renderTopBorder` in `src/integrations/pi/components/upstream/history/editor-core.ts` builds the counter as
`${length - index}/${length} ` and draws it either after `HISTORY_COUNTER_PREFIX` (`── `, the plain branch) or
alone after the three-cell inset (the branch with the centred `↑ N more` overflow cue). It is numeric only because
of the earlier `compact-history-counter-label` deviation. The maintainer now wants the labelled form that
`docs/features/prompt-history.md` already describes.

Decision: the counter text becomes `History ${length - index}/${length} ` in both branches, so the border reads
`── History 100/100 ─…` and `── History 1/100 ─…`. The word `History` takes the same `dim` label style as the
numbers. The three-cell inset, count calculation, clipping by `truncateToWidth`, and the overflow-cue collision
rule (cue shifts right, or is omitted when both cannot fit) are unchanged; the cue just collides eight cells
earlier. Pinned comparison rendering is unchanged.

Bookkeeping that follows the source edit:

- The `editor-core.ts` header and the ledger `modifications` text drop "numeric-only"; the ledger `localSha256` is
  refreshed; the `compact-history-counter-label` deviation is rewritten to describe the labelled counter at the
  shared inset (or removed if it no longer differs from upstream).
- `docs/architecture/history-editor-provenance.md` no longer says the `History` title is omitted.
- Tests: `history-editor-core.test.ts` expects `── History 100/100 ` and `── History 1/100 `;
  `history-editor-shell.test.ts` expects `History 1/1 ` in the `dim` style at column 3 instead of asserting
  that `History` is absent.
- Keep the edit to string constants inside existing lines, so no source lines move: the startup module-graph
  size budget sees only a few bytes, and the product-identity and port inventories keep their recorded positions.
  If either check still moves, update its recorded value in the same commit rather than loosening the check.

## Documentation

- README navigator lists every `##` section in order: Install, Launch, Session colors, Update, Uninstall,
  Extensions, Develop, Publish.
- README Update setting: the second value is **Manual** (declaration `updateCheck`, values `auto`/`manual`).
- `docs/features/prompt-history.md` already matches the new behaviour and is not edited.
- `ci.yml` comment: becomes a `Rationale:` comment saying this owner records an overrun, Full regression also
  records it for the nightly regression triage, and only stable (`latest`) publication fails on it.

## Uninstall keeps user data unless purged

`runUninstall` in `src/cli/uninstall.ts` asks "Remove a1 from this machine? [y/N]" and then, when not purging,
`purge ||= await dependencies.confirm("Also delete your sessions, settings, and sign-ins in <profileHome>? [y/N]")`.

Decision: the second question is removed. Interactive `a1 uninstall` asks only the removal question and keeps the
profile home (sessions, settings, sign-ins) unless `--purge` was given, like vanilla Pi, whose npm program removal
never touches user data. `--yes` and `--purge` behave as today, and the closing line still names the kept profile
home. The `runUninstall` doc comment says user data leaves only with `--purge`; the README Uninstall section says
the same instead of "It asks before deleting your sessions and settings". The help text in
`src/cli/package-messages.ts` already says "sessions and settings stay unless --purge" and is unchanged.
