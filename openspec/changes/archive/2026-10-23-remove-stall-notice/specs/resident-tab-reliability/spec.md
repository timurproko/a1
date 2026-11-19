## MODIFIED Requirements

### Requirement: Liveness and progress are supervised separately
Each resident tab's A1 process SHALL emit bridge heartbeats from its event loop. The server SHALL measure heartbeat silence only over intervals in which the bridge connection stayed established, the holder's own supervision heartbeats were current, the holder reported the child alive with its recorded identity, and the server's own loop met its deadline; any break SHALL reset the measurement. Server or bridge transport loss alone SHALL NOT be classified as a child hang or authorize child termination. An A1 process that has missed heartbeats for 30 seconds of healthy observation SHALL be recorded as unresponsive in the registry and counters; after `tabsUnresponsiveRestartSeconds` (default 120) it SHALL be terminated as a verified tree, gracefully then forcibly, and restarted from its session under the restart budget with its prompt journal, draft, and last screen preserved. The unresponsive state SHALL NOT change the tab's presented status, chip glyph, or colour, and SHALL NOT paint a notice row or bind a restart key. A tab that is working without model or tool progress SHALL NOT be classified, reported, or presented as stalled, SHALL NOT receive a transcript notice, and SHALL NOT be terminated automatically, because long-running tools are legitimate.

#### Scenario: A1 event loop wedges
- **WHEN** a tab's A1 process stops emitting bridge heartbeats while its process is alive and supervision is healthy
- **THEN** the server SHALL record the tab as unresponsive within 30 seconds, and after the configured interval it SHALL restart from its session with the pending prompt offered back
- **AND** the tab's chip SHALL keep its previous status glyph, and no notice row or restart key SHALL appear

#### Scenario: Heartbeats resume before restart
- **WHEN** an unresponsive tab's A1 process resumes heartbeats before the restart interval ends
- **THEN** the server SHALL return the tab to running without restarting it and without changing its presented status

#### Scenario: Server loss interrupts bridge delivery
- **WHEN** the server dies or the bridge transport fails while a child remains alive
- **THEN** holders SHALL keep the child running, status SHALL degrade, and the heartbeat restart deadline SHALL NOT be applied to the outage

#### Scenario: Provider stream stalls
- **WHEN** a working tab receives no model or tool progress for five minutes or longer
- **THEN** the tab SHALL keep its working status, the transcript SHALL gain no progress notice, and the tab SHALL NOT be killed automatically
- **AND** a bare `R` typed into the tab SHALL reach the tab as text
