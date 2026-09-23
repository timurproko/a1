## Context

The autocomplete renderer combines a command's optional `argumentHint` with its description using the visible ` – ` separator. A1 currently reuses pinned metadata for the `thinking` and `login` built-ins, and the runtime workflow catalog also decorates `login` with `<provider>`. Removing text after rendering would couple a narrow product choice to terminal output and could also affect prompt-template or extension hints.

Bare A1 already owns a profile-specific command catalog, while `a1 pi` exists to retain pinned behavior. The change can therefore be expressed at the metadata boundary without changing the shared renderer or command workflows.

## Goals / Non-Goals

**Goals:**
- Render plain `thinking` and `login` descriptions in bare A1.
- Keep their argument choices and command outcomes unchanged.
- Keep pinned comparison metadata and all unrelated argument hints unchanged.
- Cover both static catalog construction and runtime command decoration.

**Non-Goals:**
- Removing argument hints globally.
- Renaming `login`, changing it to a different provider-authentication command, or changing authentication behavior.
- Changing the thinking selector, provider selector, command order, selected-row colors, or completion layout.
- Changing `a1 pi` or installed Pi packages.

## Decisions

### 1. Make the two owned catalog entries explicitly hint-free

The bare-A1 built-in catalog will use owned `thinking` and `login` entries that retain their current descriptions but omit `argumentHint`. The pinned catalog will keep `<level>` and `<provider>` so the comparison route remains unchanged.

This is preferable to stripping angle-bracket text from rendered rows because metadata continues to determine presentation and unrelated resources remain free to advertise argument syntax.

### 2. Keep bare runtime decoration consistent with the owned catalog

The workflow resource catalog will omit the login `argumentHint` only in bare product mode while continuing to publish the provider `argumentOptions`. Comparison mode will continue publishing `<provider>`.

Both the static entry and its runtime decoration must agree: a hint on either side of the merge could restore the unwanted prefix. Argument options are independent metadata, so removing the display hint does not remove provider completion.

### 3. Test visible rows and interaction separately

Focused component coverage will assert the terminal-text rows for `thinking` and `login` contain only their descriptions in bare A1 and still contain the pinned hints in the comparison profile. Engine/resource coverage will assert bare login metadata retains provider options without the hint. Completion coverage will exercise argument suggestions after the commands so a concise top-level row cannot regress the underlying workflows.

## Risks / Trade-offs

- [A runtime addition restores the hint] -> Make product-mode resource metadata explicit and test the merged visible row.
- [Removing the hint accidentally removes argument completion] -> Retain and independently assert `argumentOptions` and command-argument completion.
- [Pinned parity changes] -> Keep the existing pinned entries intact and assert comparison rows still show their hints.
- [Other command hints are unintentionally stripped] -> Avoid renderer-level filtering and retain focused coverage for unrelated hinted resources.
