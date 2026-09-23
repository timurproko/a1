## Context

The autocomplete renderer combines a command's optional `argumentHint` with its description using the visible ` – ` separator. A1 currently reuses pinned metadata for the `thinking` and `login` built-ins, and the runtime workflow catalog also decorates `login` with `<provider>`. Removing text after rendering would couple a narrow product choice to terminal output and could also affect prompt-template or extension hints.

Bare A1 already owns a profile-specific command catalog, while `a1 pi` exists to retain pinned behavior. The change can therefore be expressed at the metadata boundary without changing the shared renderer or command workflows.

## Goals / Non-Goals

**Goals:**
- Render plain `thinking` and `login` descriptions in bare A1.
- Keep direct thinking-level arguments, provider argument choices, and command outcomes unchanged.
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

Focused component coverage will assert the terminal-text rows for `thinking` and `login` contain only their descriptions in bare A1 and still contain the pinned hints in the comparison profile. Engine/resource coverage will assert bare login metadata retains provider options without the hint. Workflow coverage will retain direct thinking-level invocation, and completion coverage will exercise provider suggestions so a concise top-level row cannot regress the underlying workflows.

## Risks / Trade-offs

- [A runtime addition restores the hint] -> Make product-mode resource metadata explicit and test the merged visible row.
- [Removing the hint accidentally changes argument handling] -> Retain and independently assert provider `argumentOptions`, provider completion, and direct thinking-level invocation.
- [Pinned parity changes] -> Keep the existing pinned entries intact and assert comparison rows still show their hints.
- [Other command hints are unintentionally stripped] -> Avoid renderer-level filtering and retain focused coverage for unrelated hinted resources.

## Implementation Evidence

- `npx --no-install vitest run test/integrations/pi/components/shell-components.test.ts test/app/session-shell/session-shell-models.test.ts test/integrations/pi/engine/engine-collaborators.test.ts test/integrations/pi/engine/workflows.test.ts` passes 77 focused tests covering visible rows, profile isolation, provider options/completion, direct thinking arguments, and command-catalog behavior.
- `npm run build` and the subsequent `npm run typecheck` pass.
- `npm run check:architecture` passes after `config/startup-graph-baseline.json` is re-pinned from 1,477,685 to the measured 1,478,075 startup source bytes; file count and Pi public-artifact bounds are unchanged.
- `npx --no-install openspec validate simplify-thinking-login-command-descriptions --strict` passes.
- No known implementation or validation gaps remain. The manual handoff uses `./scripts/dev` for bare A1 and `./scripts/dev pi` for the pinned comparison.
