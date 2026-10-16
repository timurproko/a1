## ADDED Requirements

### Requirement: Host stop completes when a tab's processes are already gone
When stopping the host, the resident server SHALL count a tab as stopped once it verifies that the tab's holder and recorded child no longer exist, even if the server still tracks a connection or a pending readmission for that tab. Releasing such a tab SHALL clear only server bookkeeping and SHALL NOT signal any process. A tab whose holder or child is still live, or whose process state can't be verified, SHALL stay remaining, and the stop SHALL report why for each remaining tab.

#### Scenario: Holder dies while awaiting readmission
- **WHEN** a replacement server is waiting for a recorded holder to reconnect, that holder and its child exit, and the user runs `a1 tabs host stop`
- **THEN** the stop SHALL report the host as stopped and the tab as released, and no resident process SHALL remain running

#### Scenario: Process state can't be verified
- **WHEN** the server can't verify whether a remaining tab's holder still exists
- **THEN** the stop SHALL keep that tab remaining with the reason `unverifiable` and SHALL NOT report the host as stopped
