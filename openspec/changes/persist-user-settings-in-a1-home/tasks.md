# Tasks

## 1. Resolve one stable settings root

- [ ] 1.1 Add a launch-profile path contract that selects `<effective-home>/.a1` for normal owned settings, exposes the former platform config root only as an unoverridden compatibility source, and keeps explicit `A1_CONFIG_DIR` isolated; verify cross-platform path tests cover default, override, and package/release-independent resolution.
- [ ] 1.2 Wire owned-UI composition and pre-UI resident-tabs routing to the same resolved roots without relocating other product config consumers; verify focused composition and bootstrap tests observe the same primary and fallback paths.

## 2. Preserve and migrate stored preferences

- [ ] 2.1 Extend owned-settings reads with primary-first, missing-only fallback semantics and verify persistence tests cover primary precedence, malformed-primary refusal, absent-file defaults, and former-document preservation.
- [ ] 2.2 Persist the complete fallback-derived resolution to the `.a1` primary on the next accepted A1-owned change, preserving unknown keys and atomic writes; verify a fresh manager and simulated replacement release read the migrated values while the former document remains byte-identical.
- [ ] 2.3 Apply the same missing-only precedence to resident launch settings and verify pre-UI tests cover fallback, primary override, unreadable primary, and explicit `A1_CONFIG_DIR` isolation.
- [ ] 2.4 Add a storage-boundary test proving A1-owned writes target `.a1/settings` without changing Pi-backed Agent settings in `.a1/agent/settings.json` or vanilla Pi state.

## 3. Integration validation

- [ ] 3.1 Run the focused launch, settings persistence, resident routing, and composition suites plus repository typechecking, then record exact results and known-gap disposition in implementation evidence.
- [ ] 3.2 Build the interactive candidate and hand off a restart check that changes both an A1-owned and Agent-owned setting, relaunches from the same home, and confirms both values return from their separate `.a1` documents.
