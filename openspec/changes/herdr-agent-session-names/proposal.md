# Generic A1 plugin and two-way session names

## Why

Herdr's A1 integration is presented as a color-only plugin, and its Agents menu cannot rename an A1 session. People need independent integration switches and one durable session name whether they edit it in A1 or from Herdr's left sidebar.

## What Changes

- Extend protocol 1 with authoritative session-name readback in `session.get` and an exact-target `session.rename` operation, using the same bounded client and fenced runtime transport as colors.
- Make external renames ordinary manual session-name changes, updating persistence, A1 UI and program reporting through existing application/engine owners rather than editing transcripts or terminal titles independently.
- Present the Herdr plugin as **A1**, with separate **Match space color** and **Sidebar rename** settings under its master enable switch; preserve existing color preferences and stable identifiers.
- Add **Rename** to an eligible A1 agent's left-sidebar context menu. Capture the clicked agent's native identity, read its current name and revision, and submit a guarded rename through the shared API. Preserve the already-working vanilla A1 → Herdr name updates unchanged, even when the plugin is disabled; do not introduce a second sync path, display override or permanent local alias.

## Capabilities

### New Capabilities
- `herdr-a1-integration`: generic plugin feature settings and API-backed sidebar renaming, preserving existing native name updates.

### Modified Capabilities
- `integration-api`: exact-session name snapshots and acknowledged, optimistic-concurrency renames.

## Impact

A1 changes affect the integration protocol/client validation, runtime composition, the neutral naming port, its Pi adapter, CLI help, native reporting regression fixtures and integration documentation. Colors retain their existing settings API.

Herdr canonical source is external to this repository: `C:/Users/tprokopiev/.config/herdr-app/customizations/`, managed separately through yadm. Its plugin declaration, shared API client, generic menu integration, rename UI/controller, packaging, preference validation and fixtures must be updated there after approval. This PR tracks the coordinated outcome, but cannot contain those external source bytes; evidence will identify their actual diff and validation separately.

No native Herdr/Core changes, terminal-input injection, automatic installation/restarts, private endpoint discovery, unrelated agent rename protocol or merge authority are included. This is a planning-only draft until the plan is approved and implementation is requested.
