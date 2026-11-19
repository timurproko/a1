## ADDED Requirements

### Requirement: Crashed and hung tabs restart within a bounded budget
When a tab's A1 process exits without a requested stop, or is terminated as unresponsive, the server SHALL restart it by instructing its holder to start `ui.js --tab --session <file>` for the tab's Pi session, with backoff of 1, 5, and 30 seconds, at most one start in flight per tab, and only after the previous child and its process tree are verified gone and the session-writer lock is acquired. The restart budget SHALL be persisted in the registry before each restart. After three restarts within ten minutes the tab SHALL become failed and SHALL NOT restart automatically until the user chooses retry, start fresh, or close. A restart SHALL NOT resend an interrupted prompt. If child standard error is separately available, it SHALL be stored only as private bounded recovery data, not as a diagnostic log.

#### Scenario: Tab process killed
- **WHEN** a tab's A1 process is killed externally
- **THEN** the holder SHALL restart it from its session after the first backoff interval and the tab SHALL show its transcript again

#### Scenario: Interrupted turn after restart
- **WHEN** a tab crashed after the user's prompt was journaled but before a reply settled
- **THEN** the restarted tab SHALL be idle and SHALL offer the prompt without resubmitting it

#### Scenario: Restart budget survives server replacement
- **WHEN** a tab has used two restarts and the server is replaced before the tab crashes again
- **THEN** the replacement server SHALL count the next crash as the third restart within the window

#### Scenario: Previous writer not yet gone
- **WHEN** a restart is due but the previous child's exit cannot be verified or its session-writer lock is still held
- **THEN** the tab SHALL stay crashed with the reason and SHALL NOT start a second writer

### Requirement: Reboot and logout end tabs without losing sessions
Resident processes SHALL end with the operating-system session, and this version SHALL NOT restore tabs after reboot or logout. When the server starts under a different boot identity or operating-system session identity, or finds every recorded holder gone while the operating-system session identity cannot be determined, it SHALL move the previous tab set to registry history in one durable mutation instead of starting those tabs, and bare `a1` SHALL start with one new tab. Every previous Pi session SHALL stay resumable through the normal session picker or `a1 --session`. A pending journaled prompt SHALL be offered, without replay, when its session is next opened in a tab within seven days. A reserved first-turn identity whose journal proves the session file was never created SHALL be recoverable the same way rather than treated as a missing transcript.

#### Scenario: Reboot with three tabs
- **WHEN** the machine reboots with three running tabs and the user runs `a1`
- **THEN** A1 SHALL start one new tab, and all three previous sessions SHALL be listed in the session picker with every committed transcript entry

#### Scenario: First-turn session file does not yet exist
- **WHEN** a reboot leaves a durable reserved session identity and pending journal but Pi had not created the first session file
- **THEN** opening that identity SHALL offer the prompt idle rather than treat it as a missing existing transcript or automatically resend it

#### Scenario: Journaled prompt older than seven days
- **WHEN** a previous session is opened in a tab more than seven days after its prompt was journaled
- **THEN** the prompt SHALL NOT be offered and the session SHALL open normally

#### Scenario: Same boot and session after a server crash
- **WHEN** the server restarts under the same boot and operating-system session identity and finds a tab's holder gone
- **THEN** that tab SHALL follow crash restart rather than move to history
