# External automatic-name control without sidebar renaming

## Why

The recently added Agents-sidebar Rename action is unwanted. External applications still need the existing session.rename API and explicit control over whether A1 may generate a session name automatically.

## What Changes

- Extend protocol 1 settings.get/settings.update/settings.list with a boolean sessionAutoName setting scoped to an exact session/runtime, without removing session.rename.
- Persist an explicit automatic-naming preference with the session. With no override, retain the profile's existing Automatic session name behavior. Disabling cancels pending naming and preserves the current name; enabling allows future ordinary eligible naming without overwriting manually owned names.
- Remove the Herdr Agents-sidebar Rename action, inline editor, and Sidebar rename plugin setting. Keep the generic A1 plugin, stable plugin identifiers, color matching, tab/space renaming and native A1-to-Herdr name reporting unchanged.
- Add focused API, persistence, cancellation, replacement and sidebar-removal fixtures and update consumer documentation.

## Capabilities

### Modified Capabilities
- integration-api: explicit exact-session automatic-name read/update support alongside external manual renaming.
- herdr-a1-integration: remove sidebar renaming while preserving plugin/color preferences and native name reporting.

## Impact

A1 changes affect the integration protocol and settings descriptors/readback, composition, neutral session naming contract, Pi persistence adapter, naming controller and documentation/tests. Herdr canonical source is C:/Users/tprokopiev/.config/herdr-app/customizations/, managed separately by yadm; its actual source diff and checks must be recorded separately because those bytes cannot be committed to this repository.

This is a planning-only draft. Production source edits require approval and an implementation request. Native Herdr/Core patches, publication, process restarts, input injection, live-session mutation tests, global profile API control and merge authority are excluded.
