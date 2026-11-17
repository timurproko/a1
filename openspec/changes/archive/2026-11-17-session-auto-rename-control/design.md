## Context

session.rename already performs guarded manual renames through OwnedUiSessionNamingPort and PiSessionNaming, preserving externally assigned names against automatic naming. sessionAutoName currently lives only in profile settings; the public settings API accepts only two string-valued color settings. SessionNamingController reads the profile toggle and independently rejects user-owned names. The recently integrated Herdr consumer contributes Rename through its generic plugin action hook and mounts an inline Agents-row editor.

## Decisions

### 1. Reuse the settings API for an explicit session boolean

Expose sessionAutoName through settings.list/get/update for exact session targets, deriving its label/description from the existing application declaration. Require a JSON boolean; never coerce strings or numbers. Keep existing color requests, descriptors, capabilities and session.rename compatible. Results retain target, setting, storedValue, effectiveValue, origin, application and update status. storedValue is null before a session override exists, otherwise boolean; effectiveValue is always boolean; origin distinguishes inherited profile policy from session policy. application is live. A successful update acknowledges only a durable applied override.

Do not expose profile sessionAutoName writes in this change. A session override wins over later profile changes, while sessions without one retain current profile behavior. No reset-to-inherit operation is introduced. External callers may disable first, then use the existing revision-guarded session.rename; no second rename endpoint or sidebar-specific control is needed.

### 2. Keep persistence and cancellation under existing naming owners

Extend the neutral naming port with read/update authority for the session's persisted automatic-name override. The Pi adapter appends a versioned custom metadata entry through the SessionManager API, not direct transcript-file writes. Keep this metadata independent of existing automatic-name provenance so changing the toggle neither transfers name ownership nor invalidates current manual names. Same-value writes are idempotent. Nonpersistent/unavailable sessions fail closed. The pinned SessionManager defers setup-only session files until the first conversation message; policy updates before that point return session-unavailable rather than claiming a durable metadata write.

Composition combines override and existing profile setting when providing SessionNamingController.enabled. A synchronous naming-port policy notification aborts pending completion immediately, including disable/re-enable before queued UI events drain. Recheck policy at application time, including after a late provider reply. Session binding changes must load only the replacement session's metadata; resume restores the original preference. A1 Pi comparison mode remains outside automatic naming.

Enabling does not rename immediately, regenerate an already-completed context, clear manual ownership or rewrite a current name. It merely permits the existing eligibility policy on a future user prompt. Existing session.rename validation, nameRevision conflicts and ordinary name-change reporting remain unchanged.

### 3. Remove the sidebar feature, not external naming

In canonical Herdr source, remove the A1 agent Rename contribution and Sidebar rename setting, retire its inline editor imports/hooks/packaged outputs and update affected fixtures/docs. Preserve any reusable generic plugin action infrastructure needed by other actions. Preserve Pin, Close, agent click/double-click navigation, grouping, tab/space inline rename, A1 color matching and stable a1-colors plugin identifiers.

Old portable preferences containing renameSession remain readable but cannot re-enable the removed action; ignore or retain the obsolete field without changing unrelated preferences. Do not add a new autorename sidebar control. Native A1-to-Herdr manual/automatic name updates remain unconditional and use the existing reporting path. The shared external session.rename client/API remains available where used outside the retired sidebar feature.

## Validation and delivery

Implement the A1 outcome first, commit/push/tick it, then the coordinated Herdr removal. A1 checks are limited to typecheck, focused changed test files and strict OpenSpec validation. Cover boolean validation, inherited/overridden readback, durable acknowledgement, same-value writes, resume/replacement isolation, cancellation/late reply, manual-name preservation and unchanged color/rename operations. Consult the pinned Pi SDK and session persistence contracts before adapter edits.

Herdr checks follow its source contract using disposable fixtures: focused removal tests, required customization test/build/host checks and conflict-safe deploy/doctor/native checks. No real agent mutations, native binary changes, restarts or topology changes. Report build, deployment and actual UI inspection separately. Record external source paths/diff and test results in implementation-evidence.md before the final implementation outcome is checked.

## Risks and exclusions

A boolean setting broadens protocol value types; parsers and response validation must remain setting-specific. Profile-inherited readback must not pretend an override exists. Pending naming must be cancelled at the policy boundary, not merely hidden in the UI. Generated Herdr output may have ownership conflicts; stop rather than overwrite modified files. Existing running A1 installations will not gain API support until separately published/upgraded; do not claim old runtimes support this control.
