## ADDED Requirements

### Requirement: Tab failure is presented and recoverable per tab
A crashed, restarting, or failed tab SHALL show its state in its own strip entry and SHALL show a banner with its reason over its read-only last-screen snapshot. A failed tab's banner SHALL offer `[r] retry`, `[f] start fresh`, and `[alt+w] close`, handled by the attach client while that tab is viewed. Retry SHALL reset the restart budget and start the tab once; start fresh SHALL open a new Pi session in the tab's cwd and leave the previous session resumable; close SHALL remove the tab and leave its session resumable. When a restarted tab's last journaled prompt had no settled reply, A1 SHALL offer that prompt back into the editor and SHALL NOT resend it. Other tabs SHALL remain fully operable throughout.

#### Scenario: One tab crashes
- **WHEN** one tab's A1 process exits unexpectedly during a turn
- **THEN** only that tab SHALL show crash and restart state, and other tabs SHALL keep streaming and accepting input

#### Scenario: Restart budget exhausted
- **WHEN** a tab crashes three times within ten minutes
- **THEN** it SHALL show failed with retry, fresh, and close actions and SHALL NOT restart automatically again

#### Scenario: Start fresh after failure
- **WHEN** the user presses `f` on a failed tab
- **THEN** the tab SHALL start a new session in the same cwd and the failed session SHALL remain in the session picker

#### Scenario: Recovered prompt and draft together
- **WHEN** a restarted tab has both an unfinished journaled prompt and a non-empty recovered draft
- **THEN** the prompt SHALL be placed in the editor, the draft SHALL be kept in editor history, and a notice SHALL say both were recovered
