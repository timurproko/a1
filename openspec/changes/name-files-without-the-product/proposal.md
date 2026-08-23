## Why

The repository named its own files after the product: `bin/a1.js`, `bin/a1-ui.js`, `bin/a1-guardian.js`,
`bin/a1-supervisor.js`, the crates `a1-process-guardian` and `a1-terminal-host`, and the executables they
build. Inside this repository the product is a given, so the prefix says nothing a reader does not already
know; it only makes the product's name part of the tree's structure, so renaming the product would mean
renaming files, manifests, workflows, provenance records, and every test that names them.

The rule was written the other way round: the specification required entry filenames to carry `a1`, and
governance enforced it. That kept the prefix in place and would have re-introduced it on the next file
added.

## What Changes

- Name files, directories, crates, and executables for their role: `bin/cli.js`, `bin/ui.js`,
  `bin/guardian.js`, `bin/supervisor.js`, crates and executables `process-guardian` and `terminal-host`.
- Keep the product's name where something outside the repository addresses A1: the installed command `a1`,
  the npm package, `A1_*` environment variables, state directories, protocol and evidence schemas, endpoint
  names, and user-visible output.
- Replace the specification requirement that demanded `a1`-prefixed entry filenames with one that says
  files and code identifiers are named for what they do, and says where the product name does belong — so
  the next entry point is named correctly without this being decided again.

## Impact

- The installed command is unchanged: `a1` still resolves, now through `bin/cli.js`.
- Release manifests, protocol frames, and evidence schemas are unchanged; only names of files and crates
  move.
