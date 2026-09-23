## 1. Add the direct command grammar

- [x] 1.1 Parse `a1 help` and `a1 version` into the existing help/version outcomes while retaining flag aliases, and verify parser/dispatch tests prove identical output, exit status, and zero unrelated handler calls.
- [x] 1.2 Parse direct install, remove/uninstall, and list commands into the existing package requests while retaining `a1 pi` aliases, and verify each preferred/compatibility pair produces the same request.
- [x] 1.3 Partition direct update forms across stable/development self-update, model refresh, all-extension update, and single-package update while preserving removed and pinned-runtime boundaries, and verify focused parser tests cover valid, conflicting, extra, and unsupported forms.

## 2. Present direct-first help and diagnostics

- [x] 2.1 Carry direct-versus-compatibility invocation context through package help and syntax diagnostics, and verify focused transcript tests preserve pinned styling, streams, exit codes, and the entered namespace.
- [x] 2.2 Add complete direct update help covering stable, development, model, extension, and single-package forms, and verify explicit help dispatches no update, package, model, or runtime operation.
- [x] 2.3 Make complete application help lead with the direct commands while identifying retained compatibility aliases, and verify prerelease and release usage snapshots advertise exactly the supported grammar.

## 3. Update user documentation

- [x] 3.1 Replace README usage examples with `a1 help`, `a1 version`, direct package verbs, `a1 update --extensions`, and `a1 update <source>`, and verify the documentation-governance test matches the implemented command surface.
- [x] 3.2 Document `--help`/`-h`, `--version`/`-v`, and supported `a1 pi` package forms as compatibility aliases without advertising project-local package scope, package configuration, or independent Pi updates, and verify repository documentation assertions pass.

## 4. Verify the integrated behavior

- [x] 4.1 Extend CLI dispatch and package-message parity coverage for direct forms, alias equivalence, malformed recognized grammar, quiet unknown commands, and pinned Pi refusals, and verify the focused CLI test set passes.
- [x] 4.2 Exercise the built public CLI entry for `help`, `version`, and representative direct package/update parsing paths, and verify informational forms never launch the interactive runtime and package forms reach only the existing package handler.
- [x] 4.3 Run typechecking, strict OpenSpec validation, and the selected focused implementation tests; record the results and any known gaps before finalization.
