## Context

The current parser represents every invalid invocation as an error and dispatch
always appends `cliUsage()`. Development updates are parsed as top-level command
names beginning with `update:`. Package model refresh already has one operation
port, but only the top-level spelling reaches it.

## Goals

- Give stable and development self-update one conventional option grammar.
- Make help opt-in and make unsupported words harmless and silent.
- Preserve focused diagnostics for malformed recognized commands.
- Reuse the existing model refresh operation for Pi-compatible notation.
- Keep package and update operations dependency-light and non-interactive.

## Non-goals

- Compatibility aliases or deprecation messages for removed update forms.
- Project-local package installation/removal and its trust policy.
- An `a1 pi config` resource selector.
- A1-native plugin installation or update commands.
- Updating A1's pinned Pi runtime independently.

## Decisions

### One development selector

The grammar is:

```text
a1 update
a1 update --develop [preview-number|full-preview-version]
a1 update --models
```

No value after `--develop` selects the moving internal npm `next` dist-tag. A
positive decimal selects the unique published version ending `-dev.<number>`. A
full value must be a numbered prerelease of the form
`<major>.<minor>.<patch>-dev.<positive-number>`.

`--develop` and `--models` are mutually exclusive. Stable versions, zero, hashes,
extra values, and additional flags fail before registry or runtime work.

### Explicit help, silent unsupported grammar

The parser distinguishes three outcomes:

- `help`: render the complete command surface and exit successfully;
- `noop`: write nothing, invoke no handler, and exit successfully;
- `error`: print one concise diagnostic and exit unsuccessfully.

An unknown top-level word, unknown operation under `a1 pi`, a comparison launch in
a release build, and every removed colon update form are `noop`. Missing operands,
invalid options, conflicting options, and attempts to mutate the pinned runtime are
recognized-command errors. Dispatch never appends help to an error; help appears
only for `--help` or `-h`.

### Pi model refresh is an alias, not a second implementation

`a1 update --models` and `a1 pi update --models` produce the same typed package
request and call the existing A1-profile model refresh port. Neither launches a
profile or updates Pi.

### Reserved command spaces stay unavailable

Top-level install/remove/list/config/package-target update forms are reserved for a
future A1-native plugin system. Project-local Pi package writes and `a1 pi config`
remain future work because they require an explicit project trust and interactive
configuration design. Until then they follow the silent unsupported-command rule
when the leading operation is unknown; malformed forms of a recognized operation
remain errors.

## Risks and mitigations

- **Typos become quiet:** this is the requested behavior. Explicit `--help` remains
  available and tests prove no runtime starts.
- **Scripts using colon updates stop updating:** there is intentionally no fallback.
  README and help move atomically to the canonical forms.
- **Help drifts from parsing:** one focused transcript test pins both prerelease and
  release help while parser tests cover every advertised form.
