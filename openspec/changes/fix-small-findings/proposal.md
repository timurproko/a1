## Why

Several user-facing texts are wrong:

- When a prompt has too many images, bare A1 says "To change the limit /settings.", but bare A1 has no `/settings`
  command; the limit is the **Prompt image limit** setting in Settings → Agent, reached through the Launcher
  (Ctrl+P). Where no such setting exists (Pi-compatible shells), the hint promises something that cannot be done.
- Resuming a session that is open in another A1 process asks to fork with the header
  "Session found in different project: <current folder>", which names the wrong reason and the wrong folder.
- The README navigator omits the Uninstall and Session colors sections, and the README calls the second Update
  setting value "No" where the setting offers "Manual".
- `docs/features/prompt-history.md` says the editor border shows `History 100/100`; the editor shows `100/100`.
- A `ci.yml` comment says nightly publication and Full regression fail on a startup-budget overrun; both only
  record it, and only stable (`latest`) publication fails.

## What Changes

- The image-count message names the real setting path, and only where the limit is configurable.
- The fork prompt for a session that is open elsewhere says so instead of claiming a different project.
- README, prompt-history docs and the `ci.yml` comment are corrected.

## Impact

- `src/contracts/owned-ui/image-attachments.ts`, `src/app/session-shell/prompt-chips.ts` and their tests.
- `src/integrations/pi/engine/session-selection.ts`, `src/features/owned-ui/session-fork-prompt.ts` and their tests.
- `README.md`, `docs/features/prompt-history.md`, `.github/workflows/ci.yml` (comment only).
- New capability specs `prompt-image-limit` and `session-resume-prompts`.
- Out of scope: the behaviour of `a1 uninstall --yes`, which awaits a maintainer decision.
