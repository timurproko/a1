## 1. Establish the settings application contract

- [x] 1.1 Extend the agent-settings descriptor, validation, snapshots, and change outcome with stored/effective values, `live | next-session | next-start | current-exit` timing, availability, and limitation reason; verify focused contract and settings-section tests reject incomplete or contradictory descriptors
- [x] 1.2 Add an exhaustive reviewed effect registry for every key in generated Pi settings metadata, including owner, timing, and capability predicate; verify an added, removed, duplicated, or unmapped generated key fails the inventory test by name
- [x] 1.3 Implement the settings coordinator's validate, apply, persist, flush, rollback, bind-owner, and unbind-owner behavior; verify focused tests cover live success, deferred success, unavailable settings, effect failure, flush failure, rollback, rollback failure diagnostics, and disposal
- [x] 1.4 Route `PiSettingsIntegration` reads and writes through the coordinator and expose truthful effective state; verify storage-only setters can no longer make a descriptor writable without an effect or lifecycle handler
- [ ] 1.5 Update the owned settings session and app to display applied, deferred, and unavailable outcomes with exact reasons and effective values; verify changing a live, next-start, current-exit, and unavailable fixture produces the specified screen state
- [ ] 1.6 Delegate the pinned settings selector callbacks to the same coordinator rather than a second key-to-callback path; verify owned and pinned routes produce the same setting mutation and owner effect for a representative key in every owner category

## 2. Resolve project trust before engine activation

- [x] 2.1 Split launch into global-settings/trust preflight and project-backed engine activation so no project settings or resource loader is constructed before an effective decision; verify order-sensitive tests fail if any project source is read before trust resolution
- [x] 2.2 Resolve saved path decisions and `defaultProjectTrust` with pinned precedence for trusted, untrusted, and ask defaults; verify focused fixtures cover parent/child path decisions, an undecided path, and a changed default applying on the next start
- [x] 2.3 Add the bounded pre-session trust surface for undecided interactive launches and a fail-closed non-interactive path; verify accept, reject, cancel, error, and unavailable-interaction cases load no project resource before completion
- [x] 2.4 Bind the existing `/trust` workflow to the same persisted decision authority for future launches; verify changing trust in-session cannot retroactively claim that already-loaded resources were protected and the next launch honors the saved decision

## 3. Apply active agent and provider settings

- [ ] 3.1 Bind `autoCompact`, `autoResizeImages`, and `blockImages` to the active session and verify subsequent compaction checks, prompt images, tool images, and provider context observe live changes
- [ ] 3.2 Bind `steeringMode`, `followUpMode`, and `transport` to the active agent and verify subsequent queued prompts and provider requests use new values without session recreation
- [ ] 3.3 Bind `thinkingLevel` to the active session and persisted fresh-session default; verify capability clamping, footer/editor indicators, current-session requests, and a later fresh session agree
- [x] 3.4 Rebuild skill command registration and autocomplete when `enableSkillCommands` changes; verify commands appear or disappear live while unrelated extension and prompt commands retain identity and order
- [ ] 3.5 Apply `httpIdleTimeoutMs` to both provider streaming and Pi HTTP dispatcher configuration, including zero's disabled semantics; verify focused timeout-option and sequential-launch tests detect an immediate-timeout regression or leaked prior-profile value
- [ ] 3.6 Bind structured `warnings` and `showCacheMissNotices` at their decision points; verify each warning flag changes only its declared warning and cache-miss notices toggle without rendered-string filtering

## 4. Apply owned-shell and terminal settings

- [x] 4.1 Replace fixed editor geometry with live `editorPaddingX` and `autocompleteMaxVisible`; verify active editor reflow, autocomplete clipping, focus, cursor, history, and narrow-terminal behavior after each change
- [ ] 4.2 Replace fixed presenter spacing with live `outputPad` and a relevant presentation cache revision; verify existing and future status, error, Markdown, tool, and transcript rows re-render without losing block identity or viewport state
- [ ] 4.3 Bind `hideThinkingBlock` and `mermaidRenderingMode` to transcript construction and Markdown transformation; verify existing finalized blocks and streaming blocks update for every Mermaid mode while selection, expansion, and semantic order remain stable
- [ ] 4.4 Bind `showHardwareCursor`, `clearOnShrink`, and `showTerminalProgress` to the active TUI/terminal lifecycle; verify terminal-operation tests cover enable, disable, resize, active-agent transitions, failure, and unconditional disposal cleanup
- [x] 4.5 Preserve live `doubleEscapeAction` and `treeFilterMode` through the coordinator; verify their next input action uses the changed value and both settings have behavioral rather than persistence-only coverage
- [x] 4.6 Replace bare-A1 hidden filtering for `theme`, `quietStartup`, `tuiMode`, and `fullscreenScrollbar` with non-editable product-mode descriptors and precise reasons while retaining pinned comparison behavior; verify no product-fixed key is writable or silently absent in bare A1

## 5. Preserve and present transcript images

- [ ] 5.1 Add bounded transcript image-reference metadata and an owned image-asset resolver port without raising payload/view limits; verify contract validation accepts references, rejects raw oversized base64 payloads and malformed metadata, and keeps large valid attachments out of serialized views
- [ ] 5.2 Project user-message and tool-result image content into session-scoped opaque asset references backed by authoritative messages; verify references survive streaming/finalization, deduplicate without copying payloads, and are pruned on message removal, session replacement, and disposal
- [ ] 5.3 Render resolved images with pinned image components when Kitty or iTerm2 capability is advertised, honoring live `showImages`, `imageWidthCells`, and available width; verify deterministic component tests cover both source roles, resize, hide/show, width changes, and existing-block reconstruction
- [ ] 5.4 Render safe informative placeholders when images are hidden, unsupported, missing, or malformed and surface the terminal limitation in settings; verify a Windows Terminal capability fixture reports `images: null`, emits no image control sequence, and never silently drops the attachment

## 6. Honor startup, installation, and fullscreen-exit settings

- [ ] 6.1 Bind `collapseChangelog` to the next owned startup changelog composition with pinned acknowledged/new-version behavior; verify collapsed and expanded startup fixtures plus `/changelog` remain distinct and correctly rendered
- [ ] 6.2 Bind `enableInstallTelemetry` only to the applicable Pi install/update lifecycle, preserving opt-out and payload scope; verify disabled sends nothing, enabled emits only pinned events, and compositions without that lifecycle report the setting unavailable
- [ ] 6.3 Capture the final textual transcript and resume metadata before fullscreen disposal while excluding overlays, drafts, animations, hidden thinking, and inline-image payloads; verify deterministic snapshots cover empty, populated, failed, and image-containing sessions
- [ ] 6.4 Restore the alternate screen before emitting `fullscreenExitOutput`, printing transcript plus hint for `transcript` and only the hint for `resume-hint`; verify terminal byte-order tests cover normal exit, failure exit, progress cleanup, no duplicate rows, and parent-terminal usability
- [ ] 6.5 Add the narrow A1 session-selection launch form needed by the formatted resume command and centralize product-aware formatting; verify the printed command resumes the exact persisted session and handles non-default session directories and paths requiring quoting

## 7. Prove complete behavioral conformance

- [ ] 7.1 Add a table-driven conformance suite for the complete generated Pi inventory that asserts persistence, timing, availability, owner mutation, observable effect, rollback, and environment limitations for every key; verify a storage-only fake effect fails the suite
- [ ] 7.2 Add containing shell scenarios that change presentation settings during streaming, while detached, with a selector open, and after resize; verify transcript caches stay bounded and focus, scroll, selection, prompt anchors, queued work, and component identity remain intact
- [ ] 7.3 Add security and lifecycle integration cases for startup trust, dispatcher isolation, telemetry opt-out, and exit-output ordering; verify no synthetic success can substitute for an owner call or terminal operation
- [ ] 7.4 Update Pi source provenance and compatibility ledgers for every minimally ported setting behavior and public adapter use; verify architecture governance rejects private imports, reflection, prototype mutation, and unrecorded copied source
- [ ] 7.5 Run strict OpenSpec validation and the required GitHub development validation for the implementation pull request, preserving bounded failure artifacts for any setting whose effect diverges

## 8. Deliver and accept separately

- [ ] 8.1 After this specification pull request merges and the user explicitly requests implementation, fetch the resulting `origin/develop` and create the fresh detached implementation worktree at `{working-dir}/.worktrees/make-pi-settings-effective`, where `{working-dir}` is the session's initial working directory (for working directory `D:/Git/a1`, use `D:/Git/a1/.worktrees/make-pi-settings-effective`, never `D:/Git/a1-make-pi-settings-effective`), with a new branch, commit history, and code pull request citing `make-pi-settings-effective`
- [ ] 8.2 Leave the code pull request open with auto-merge disabled after CI and provide exact candidate build/run instructions for bare A1 and `a1 pi`; verify the pull-request diff contains no specification implementation accidentally stacked on this branch
- [ ] 8.3 Perform user-controlled physical-terminal acceptance for live settings, project trust, cursor, progress, shrink, fullscreen exit modes, supported-terminal inline images, Windows Terminal fallback, selection/copy, and terminal restoration; record exact A1, Pi, OS, and terminal versions
- [ ] 8.4 Merge the implementation manually only after the maintainer reports acceptance and explicitly authorizes integration, then record acceptance and archive this OpenSpec change in a separate specification-only follow-up
