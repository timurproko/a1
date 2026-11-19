## Why

Several user-facing texts are wrong:

- When a prompt has too many images, bare A1 says "To change the limit /settings.", but bare A1 has no `/settings`
  command; the limit is the **Prompt image limit** setting in Settings → Agent, reached through the Launcher
  (Ctrl+P). Where no such setting exists (Pi-compatible shells), the hint promises something that cannot be done.
- Resuming a session that is open in another A1 process asks to fork with the header
  "Session found in different project: <current folder>", which names the wrong reason and the wrong folder.
- The README navigator omits the Uninstall and Session colors sections, and the README calls the second Update
  setting value "No" where the setting offers "Manual".
- The recalled-prompt border counter shows a bare `100/100`. `docs/features/prompt-history.md` describes
  `History 100/100`, and the maintainer has chosen that labelled form, so the code changes and the docs stay.
- A `ci.yml` comment says nightly publication and Full regression fail on a startup-budget overrun; both only
  record it, and only stable (`latest`) publication fails.

## What Changes

- The image-count message names the real setting path, and only where the limit is configurable.
- The fork prompt for a session that is open elsewhere says so instead of claiming a different project.
- The prompt-history border counter reads `History N/M`, as the prompt-history docs already say.
- The README and the `ci.yml` comment are corrected.

## Impact

- `src/contracts/owned-ui/image-attachments.ts`, `src/app/session-shell/prompt-chips.ts` and their tests.
- `src/integrations/pi/engine/session-selection.ts`, `src/features/owned-ui/session-fork-prompt.ts` and their tests.
- `src/integrations/pi/components/upstream/history/editor-core.ts`, its core and shell tests, the
  `editor-core.ts` entry of `config/baselines/pinned-pi-source-port-ledger.json` and
  `docs/architecture/history-editor-provenance.md`.
- `README.md`, `.github/workflows/ci.yml` (comment only). `docs/features/prompt-history.md` is unchanged.
- New capability specs `prompt-image-limit`, `session-resume-prompts` and `prompt-history-counter`.
- Out of scope: the behaviour of `a1 uninstall --yes`, which awaits a maintainer decision.
