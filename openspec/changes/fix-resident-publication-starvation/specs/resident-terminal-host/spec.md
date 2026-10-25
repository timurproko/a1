## ADDED Requirements

### Requirement: Windows publication does not debounce sustained input indefinitely

The holder SHALL retain the earliest pending Windows render-pass publication deadline across subsequent synchronized-output markers and settling output until that publication decision is consumed. A newer frame SHALL NOT restart that deadline. Ordinary publication SHALL still withhold an open transaction, and malformed transactions SHALL retain the existing explicit bounded recovery path. Unix verbatim boundaries SHALL remain immediately publishable.

#### Scenario: Repeated frames contain their cells between relayed markers

- **WHEN** Windows receives complete transactions every 30 ms with changed cells between begin and end markers and no post-end cells
- **THEN** the holder publishes changed retained state during the sustained sequence without waiting for input to stop
- **AND** later end markers do not renew the first pending 16 ms fallback

#### Scenario: Render-pass output keeps extending the quiet interval

- **WHEN** post-marker output continues in fragments less than 2 ms apart
- **THEN** quiet-settle activity does not extend the hard pending publication deadline
- **AND** no ordinary publication exposes an open transaction

#### Scenario: Publication consumes pending wait state

- **WHEN** a complete or explicit recovery publication is consumed
- **THEN** the next independent update receives its own bounded wait
- **AND** an expired old deadline cannot bypass the next update's coherence gate

### Requirement: Real-A1 responsiveness evidence rejects delayed presentation

Healthy resident responsiveness evidence SHALL fail when matched commit-to-first-completed-outer-paint p95 exceeds 33 ms or a viewed healthy scenario supplies no matched presentation samples. Matches SHALL bind tab, incarnation and revision and SHALL exclude invalid clock intervals. Explicitly stopped-stage and slow-sink controls SHALL remain distinguishable from healthy windows. Coalescing obsolete complete surfaces SHALL remain permitted.

#### Scenario: Healthy paint is consistently delayed

- **WHEN** a healthy viewed scenario has matched completed paints 200 ms after its holder commits
- **THEN** the responsiveness verdict fails even if all processes and animations continue progressing

#### Scenario: A later strip repaint repeats a delivered revision

- **WHEN** one revision first paints within budget and is painted again by later chrome changes
- **THEN** delivery latency uses the first completed paint for that revision and incarnation

#### Scenario: Actual input exercises owned UI rendering

- **WHEN** the exact-artifact harness types synthetic text, navigates an owned menu and scrolls through the same real A1 UI directly and through resident roles at matching child dimensions
- **THEN** it observes the resulting completed synthetic screen changes in order
- **AND** it rejects missing changes, prolonged stalls and resident p95 overhead beyond the existing 16 ms input plus 33 ms presentation envelope relative to direct solo
