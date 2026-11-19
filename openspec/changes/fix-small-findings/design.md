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

## Documentation

- README navigator lists every `##` section in order: Install, Launch, Session colors, Update, Uninstall,
  Extensions, Develop, Publish.
- README Update setting: the second value is **Manual** (declaration `updateCheck`, values `auto`/`manual`).
- Prompt history: the border shows `100/100` for the newest of 100 entries and `1/100` for the oldest.
- `ci.yml` comment: becomes a `Rationale:` comment saying this owner records an overrun, Full regression also
  records it for the nightly regression triage, and only stable (`latest`) publication fails on it.
