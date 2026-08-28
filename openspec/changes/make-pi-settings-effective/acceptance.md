# Physical-terminal acceptance

Implementation candidate: PR #174 at `a0f5570ad134a827dd596df9ce5a5ef50b5b75a8` (or its latest descendant).

## Build and launch

```text
npm ci
npm run build
node bin/ui.js
node bin/ui.js --session "<exact-session-jsonl-path>"
```

Installed comparison launch:

```text
a1
a1 pi
```

## Maintainer-controlled checklist

Record the exact A1 version, pinned Pi version, OS, terminal name/version, and image protocol for each run.

- Change live agent, editor, transcript, cursor, shrink, progress, and image settings; confirm the active owner changes immediately and rollback failures are truthful.
- Verify project trust for saved trusted/untrusted paths, Ask, cancellation, and a non-interactive undecided launch before project resources activate.
- Verify Kitty/iTerm2 inline user/tool images, resize and hide/show; verify Windows Terminal shows an informative placeholder and emits no image sequence.
- Verify selection/copy, detached scrolling, open selectors, streaming, resize, queued work, prompt anchors, and editor history survive live presentation changes.
- Verify both fullscreen exit modes restore the parent terminal before transcript/resume output, clear progress, omit drafts/overlays/image payloads, and print an exact resumable command.
- Run the printed `--session` command and confirm it resumes the exact persisted session, including a non-default session directory and a path containing spaces.

Task 8.3 remains incomplete until the maintainer records results here. Task 8.4 remains incomplete until the maintainer explicitly authorizes manual integration.
