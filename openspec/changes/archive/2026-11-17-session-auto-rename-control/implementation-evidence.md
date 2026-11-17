# Implementation evidence

## A1 per-session naming policy

Implemented boolean sessionAutoName descriptors and strict setting-specific request/readback validation, synchronous exact-target routing, an independent durable Pi custom metadata entry, inherited profile policy, and synchronous controller cancellation. Existing color and session.rename operations remain intact.

Focused fixtures cover inherited/explicit booleans, invalid values/scope, readback failures, unavailable/replaced owners, persistent resume, idempotence, preserved automatic/manual provenance, late result fencing, disable/re-enable before UI delivery, future-prompt eligibility and completed-context preservation. Transport fixtures cover independent runtimes, replacement and exact-runtime mismatch.

Checks passed: npm run build; npm run typecheck; all 118 tests in these seven focused files:

- test/features/integration-api/service.test.ts
- test/features/integration-api/session-auto-name.test.ts
- test/features/integration-api/session-names.test.ts
- test/features/session-naming/session-naming.test.ts
- test/integrations/pi/engine/session-auto-name.test.ts
- test/composition/session-colors.integration.test.ts
- test/composition/session-runtime-wiring.test.ts

Pinned Pi SDK/session format documentation, sessions example and SessionManager implementation were inspected. Policy writes require an already-materialized persistent conversation file because Pi defers setup-only metadata writes. Unsupported setup-only updates return session-unavailable; this boundary is documented rather than acknowledged as durable. Explicit policy values survive resume and do not rewrite current names or naming provenance.

## External customization source

Canonical source: C:/Users/tprokopiev/.config/herdr-app/customizations/. Its owning yadm checkout was already dirty on main at 6952245ac811f3dadb3457a92289714e1cf2cdbe, including provider/grouping work. Those unrelated changes were preserved and are not staged or committed by this delivery. The task-only removal/client diff was subsequently applied on top of MyConfigs #2's existing provider commit and pushed as 662feb55d81ad6598d162f07d48095ab1be9221b, using a private index without changing the live checkout or its real index. This A1 PR records the coordinated outcome but does not contain the external source files.

Task-only changes relative to captured pre-edit bytes:

- customization.json: remove both agent-rename helper output mappings.
- src/features/agents/main.js: remove inline editor lifecycle/rendering and double-click rename; preserve existing named-space/folder grouping, pinning and navigation.
- src/features/menu/main.js: remove inline-rename result dispatch; retain generic plugin actions, Pin/Close and tab/space naming.
- src/plugins/a1-colors/plugin.js and state.js: remove Sidebar rename declarations, menus, guards, gates and enable helper; preserve stable plugin identity and color controls.
- src/plugins/a1-colors/session-color.cjs: remove the exclusively sidebar-owned name worker route, retaining color membership/expiry fences.
- src/plugins/a1-colors/session-name.js and src/ui/agent-rename.js: retire the source modules.
- src/plugins/api.cjs: accept additive boolean descriptors and validate inherited/applied sessionAutoName readback without relaxing string/color or name acknowledgements.
- src/plugins/a1-colors/session-name.test.mjs, settings.test.mjs and session-sync.test.mjs: cover removed action/gates/settings, ignored old preferences, portable import/export and unchanged colors/external naming.
- tests/agent-rename.test.mjs, agents-grouping.test.mjs, plugins.test.mjs and a1-client.test.mjs: cover removed packaging, actual clicked Pin/Close and tab/space actions, all click counts/presentations, boolean descriptor compatibility and strict readback.
- tests/features/a1-rename-native.mjs: synthetic settings/menu/ordinary-agent previews, with no real agent control or preference writes.
- README.md, docs/ARCHITECTURE.md and docs/A1-COLOR-CONTRACT.md: document removal, external naming and automatic-name control.

The task-only diff is 20 external paths. Ignored local recovery/inspection artifacts in the owning A1 worktree retain pre-edit bytes and separate preexisting/task-only diffs: .artifacts/agent/herdr-before/, herdr-preexisting.patch and herdr-task.patch. SHA-256 of herdr-task.patch is 45e7f7d2e0e99bf0957e48d60959031128c764761493d2239a7c8e27a60a2e13. These disposable artifacts are not authoritative source or portable preferences.

## External checks and deployment

Passed focused removal/grouping/plugin/client fixtures, the required customization npm test suite, npm run check:host-api, and npm run build. Herdr 0.1.16 is reviewed; no missing APIs, commands or direct native imports were reported. The customization build contains 17 modules. With A1_API_CANDIDATE_ROOT selecting this built A1 checkout, tests/a1-api-candidate.test.mjs passed against the actual public CLI and disposable runtimes, including color discovery with the added boolean descriptor, two-session isolation and stale replacement refusal.

Conflict-safe source-scoped deployment selected only the six changed production sources: Agents main, Menu main, A1 plugin declaration, A1 state, color worker and shared API client. It changed 42 outputs, preserved 836 unselected ownership entries, and removed no files. Backup: 1794926397940-27068. This mode intentionally preserves inactive obsolete owned files rather than pruning them; removed helpers are absent from new packaging and all active imports/routes are gone. No unrelated source, layout, palette or preference update was deployed.

npm run doctor passed with no issues; both existing native patch opt-ins were already current. npm run check:native passed for all 17 installed Custom mods. Native checks emitted their existing read-only hc/git warnings; no test created, killed or changed a real agent/session.

Synthetic native settings, menu and agent previews passed eager checks and were opened, captured and visually inspected. The menu contains only Pin to the top and Close; A1 settings contain only Match space color; the ordinary agent row has no editor. The fixture deliberately supplies an old renameSession:true preference. Its transient overlays were closed and private fixture mods removed by the fixture. Screenshots stay ignored under .artifacts/agent/herdr-ui/. No live agent rename or name-policy mutation was performed.

## Delivery boundaries and known-gap disposition

No remaining implementation gap is identified within the approved behavior. The setup-only durability refusal and unchanged manual-ownership rule are intentional documented boundaries, not promises of pre-conversation writes or forced re-autonaming. No A1 publication, installed-runtime upgrade, native binary change, terminal injection or process restart is included; old running A1 versions do not acquire the new API. External source changes are published in MyConfigs #2 at 662feb55d81ad6598d162f07d48095ab1be9221b, remain separate from this A1 Git history, and are not merged by the implementation update. The separately managed yadm checkout retains its unrelated dirty/staged work. Source-scoped deployment intentionally retains inert obsolete files to preserve unrelated ownership.

## Exact-head CI repair

The initial finalized run reported a forbidden owned-UI contract import in the integration API owner, one unprefixed implementation comment, an eager startup-source budget overrun and a missing archived .openspec.yaml. The API handler now consumes a small structural policy authority, matching the existing manual-name handler's dependency boundary. Automatic naming's controller is imported only after the bare-profile eligibility check, and composition awaits binding before exposing the application, so comparison mode avoids the optional product module without losing first-prompt registration. No architecture edge, startup budget or required check is weakened. The comment uses the required Rationale prefix, and schema/creation metadata is retained in the archive for ordinary automated re-finalization. Local architecture and code-documentation checks now pass; the unchanged startup ceiling contains 205 files and 1,761,468 source bytes. Build/typecheck and all 119 tests in the original seven focused files plus test/composition/session-naming.test.ts pass. Finalization inspection reports would-refinalize with only the generated acceptance manifest needing refresh.

The exact MyConfigs #2 candidate also passed its own customization unit suite, build, host audit and actual A1 CLI wire fixture from an isolated exported test tree. An intervening customization deployment had restored the older A1 declaration in Settings; a second six-source deployment restored version 3.1.0 without the Sidebar rename option, with backup 1794927282449-58280. Doctor and all 17 installed native checks passed again. No Crew source/output was selected.

The task remains attached in D:/Git/a1/.worktrees/session-auto-rename-control on fix/session-auto-rename-control; implementation PR is #971. Editing ownership is retained for follow-up; no merge authority is inferred.
