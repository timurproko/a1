# Tasks

## 1. Resident Settings Tab

- [ ] 1.1 Add compatible `agent` and `settings` resident tab kinds, normalize historical `a1`/missing kinds to Agent, and enforce one live Settings record per profile.
- [ ] 1.2 Add a session-free Settings utility launch that composes the owned Settings route with profile-global A1 and Agent settings backends, fixed title, ordinary resident input/rendering, and close-to-remove behavior.
- [ ] 1.3 Add the configurable `tabs.settings` action defaulted to `Alt+Period`, project it through native and owned shortcut registries, list it under Tabs, and show its effective label in the add menu.
- [ ] 1.4 Route the launcher and shortcut idempotently to the singleton Settings tab, including empty-strip creation, existing-tab activation, close/reopen, restart, and unavailable-start outcomes.
- [ ] 1.5 Remove `/settings` from resident Agent discovery and execution while retaining owned `a1 solo` and pinned `a1 pi` behavior; update resident feedback that previously directed users to the slash command.

## 2. Popup and Rename Interaction

- [ ] 2.1 Preserve an opened popup through its originating mouse release and model complete pointer gestures so motion hovers, enabled-row clicks invoke once, separators remain inert, and outside presses dismiss.
- [ ] 2.2 Align popup geometry, padding, labels, shortcuts, truecolor capability detection, and dark palette fallback with the approved v2 menu across Windows Terminal/Git Bash and supported Unix terminals.
- [ ] 2.3 Add grapheme-safe Ctrl+Left and Ctrl+Right word movement to inline rename without regressing selection, character motion, deletion, paste, commit, or cancel behavior.

## 3. Quiet Unlimited Tab Lifecycle

- [ ] 3.1 Retire `tabsMax` from declarations, Settings, bootstrap/native transport, admission, host status, diagnostics, and documentation while preserving any stored legacy property as unknown profile data.
- [ ] 3.2 Keep real launch/resource failures concise but remove every `tab-limit` result and user-facing limit notice; cover sustained creation beyond the former configured and hard limits under bounded sequential starts.
- [ ] 3.3 Stage successful Agent and Settings creation until first complete surface, suppress provisional starting/restoring strip animation, and commit the new chip, active state, and body once.
- [ ] 3.4 Tombstone intentional closes before termination, reject late status/surface/crash resurrection, and commit immediate removal with the prior-neighbor survivor or the cursor-hidden plus-only empty state.
- [ ] 3.5 Suppress `read-only-viewer` host text and keep the zero-tab surface free of notices, body background, clocks, stale cells, and visible child cursors while preserving plus hover.

## 4. Input Ownership and Complete Surfaces

- [ ] 4.1 Add an acknowledged controller-transfer state to attach, queue bounded keyboard/paste/pointer input until `tab.inputClaimed`, and deliver it exactly once in order or return one actionable transfer failure.
- [ ] 4.2 Make holder `Surface` messages actually complete by forcing retained full-row composition at initial, subscription, resize, recovery, and live viewed-output boundaries; never replace a complete attach body with a dirty-row patch.
- [ ] 4.3 Preserve hidden PTY draining and terminal-model updates, emit an immediate full current surface on selection, and keep subsequent partial-reply presentation live without waiting for settlement.
- [ ] 4.4 Scope revision ordering, replaceable render slots, subscriptions, and slow-client replacement per tab so one first-started or high-rate Agent cannot suppress another Agent's surfaces.
- [ ] 4.5 Reduce repaint damage for strip/status/menu changes, discard equivalent snapshots, restore the committed cursor explicitly, and avoid clear-first or stale-body frames on terminals with and without synchronized updates.

## 5. Focused Evidence

- [ ] 5.1 Cover Settings singleton creation/activation/closure, resident command suppression, solo/comparison retention, global edits, navigation, and shortcut conflict/rebinding behavior in TypeScript and native fixtures.
- [ ] 5.2 Cover popup opening release, row hover/click, separator, click-away, palette/truecolor style, and rename word-motion cases with deterministic terminal events.
- [ ] 5.3 Cover sequential creation beyond former limits, atomic create/close transitions, late intentional-close events, silent controller handoff, and the exact plus-only empty frame.
- [ ] 5.4 Drive at least three independently streaming resident children, repeatedly switch before settlement, assert successive partial frames from every Agent, and prove one stalled client does not delay another holder or client.
- [ ] 5.5 Run TypeScript typecheck, the changed focused tests, native formatting and focused terminal-host tests, and strict OpenSpec validation before implementation handoff.
