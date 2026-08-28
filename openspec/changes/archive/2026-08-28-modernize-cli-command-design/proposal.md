## Why

A1's command surface grew one feature at a time and now uses several unrelated
conventions. Development updates put their selector after a colon, version uses a
normal option, package compatibility lives under `a1 pi`, and every unknown word
prints a diagnostic followed by the entire usage line. The resulting interface is
harder to remember than the operations themselves.

The accepted command design makes normal options look like options, keeps stable
update as the shortest form, and makes development selection one coherent family.
It also makes help explicit: a user who asks for help sees it, while an accidental
or unsupported command returns quietly to the terminal without launching anything.

## What Changes

- `a1 --help` and `a1 -h` become the only ways to print the complete command list.
- A word outside the supported grammar is a silent successful no-op. It writes
  nothing, starts no runtime, and invokes no maintenance operation.
- `a1 update` remains the stable update. Development updates become
  `a1 update --develop`, `a1 update --develop <number>`, and
  `a1 update --develop <full-preview-version>`.
- The old `update:<selector>` forms and `a1 update self` are removed outright.
  They are not aliases and print no deprecation or migration message.
- Invalid combinations inside an otherwise recognized command remain failures with
  a concise diagnostic, but no failure automatically appends the complete help.
- `a1 pi update --models` becomes a compatibility alias for
  `a1 update --models`; both refresh A1's model catalogs and never update Pi.
- Attempts to update the pinned Pi runtime through recognized Pi update forms
  remain explicit failures with focused guidance.
- The README documents only implemented commands. Project-local package mutation,
  `a1 pi config`, and A1-native plugin commands remain reserved follow-up work and
  are not advertised as available.

## Capabilities

### Modified Capabilities

- `a1-shell`: use option-based development update selection and explicit help.
- `cli-self-update`: select the development channel or one immutable preview after
  `--develop`, with no legacy aliases.
- `launch-profiles`: make unsupported grammar a silent no-op before startup.
- `extension-packages`: add the Pi-compatible model refresh alias while preserving
  the pinned Pi runtime boundary.

## Impact

- Updates CLI parsing and dispatch, command help, README examples, release guidance,
  and focused CLI/governance tests.
- Does not change update transaction internals or npm's `latest`/`next` dist-tags.
- Does not add project-local package writes, the interactive package configuration
  TUI, or A1-native plugins; those require separate approved designs.
