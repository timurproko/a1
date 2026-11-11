# Session exports

Bare A1 stores exports without an explicit destination in `~/.a1/exports/`, including development runs. On Windows this normally means `C:/Users/your-name/.a1/exports/`. An explicit `A1_PROFILE_HOME` selects the user home consistently with Agent profiles; temporary development config/data directories do not relocate exports.

- `/export` or `/export --html` saves HTML there.
- `/export --jsonl` saves JSONL there.
- Supplying a filename or path retains its existing meaning, including relative paths. Format flags can also precede an explicit destination. Quote destinations containing spaces.
- Default filenames include a timestamp, session identity, and unique suffix. Existing files are not overwritten by a default export.
- The completion message reports the actual output path. Export failures remain visible.

Automatic export storage refuses linked storage-directory entries rather than following them into an unexpected checkout. SDK hosts constructing a bare engine directly supply the `reserveExport` product-storage service; an absent service fails visibly rather than falling back to the current directory. Normal product composition supplies it automatically.

Exports are user data and can contain private session content. They are not disposable build artifacts, do not belong in `.artifacts/`, and are never removed by ordinary worktree cleanup. The `a1 pi` comparison profile retains its pinned export behavior.

For an old export blocking worktree cleanup, follow [export decisions](../local-worktree-cleanup.md#export-decisions): an explicit request to delete the identified file is sufficient, without mandatory preservation or another confirmation. If preservation is wanted instead, the optional named-export operation saves and verifies a copy before removing the source. Neither choice bypasses ordinary worktree cleanup checks.
