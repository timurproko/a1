## Why

The UI specifications had accumulated requirements about how changes are delivered and accepted, finished
one-time procedures, phase language, superseded requirements kept beside their replacements, and statements the
code no longer matches. Agents reading `openspec/specs/` need a description of what the product does now.

## What Changes

- Remove requirements and scenarios that only prescribe acceptance evidence, physical-terminal review, pull-request
  handling, or other delivery process; the shared delivery workflow owns those.
- Remove requirements that a later requirement supersedes or that a more specific capability already states, and
  name the requirement that keeps the behaviour.
- Rewrite requirements the code contradicts so they state what the code does: the marker-free main prompt, the
  numeric history counter, editor-owned prompt drags, transcript selections that extend into the dock, the
  Launcher as the route to Settings, Changelog and Hotkeys, the `Update` setting's `Auto` and `Manual` choices,
  the Default color and Current color settings, and the reference-screen and Settings footer hints.
- Replace phase and history wording with present-tense statements of current behaviour.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: drops evidence-only, phase-gate, superseded and duplicated requirements; corrects command, dialog, accent and update-status requirements to the code.
- `owned-ui-settings`: states the real sections, the Launcher route, and the current Update and color settings.
- `owned-ux-architecture`: corrects the accent-family requirement to the blue default and removes history wording.
- `custom-session-viewport`: drops acceptance-only requirements and aligns selection and dock-notice requirements with the code.
- `session-frame-selection`: removes the superseded submitted-prompt copy rule and corrects prompt-drag ownership.
- `contextual-prompt-suggestions`: describes the marker-free prompt and keeps only the product part of the diagnostics requirement.
- `persistent-prompt-history`: states the current storage location and the numeric border counter; drops an acceptance-only requirement.
- `session-color-control`: keeps producer behaviour only and removes retired-route wording.
- `ui-apps`: corrects the reference-screen footer and drops a migration scenario.
- `ui-components`: removes history wording from three requirements.
- `ui-shortcuts`: corrects the Settings search hint and renames requirements whose names described a change.
- `pi-api-boundary`: keeps the presentation-independence, provenance and baseline rules and drops upgrade-proposal delivery steps.
- `pi-settings-runtime`: keeps the reviewed-effect and generated-inventory rules and drops acceptance-evidence rules.

## Impact

Specifications only. No product code, tests, configuration, or documentation changes behaviour.
