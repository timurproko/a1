## MODIFIED Requirements

### Requirement: Automatic self-update is single-owner and restart-safe

Automatic and explicit self-update SHALL share one cross-process execution lease before package mutation or prepared-candidate activation. The lease SHALL bind the canonical managed installation, verified process identity, channel, target version, execution mode, and acquisition time. A live owner SHALL prevent another package replacement or activation commit. A dead owner whose durable transaction names the same target as the new request MAY be reclaimed after process identity and transaction state are reconciled. A dead owner whose durable transaction names a different target SHALL be settled by an explicit update before it proceeds: the explicit command SHALL roll that transaction back to its recorded prior verified cohort through the existing rollback path, finish it as rolled back, remove the stale lease, and report in one line which interrupted target it rolled back, then continue with its own target. Automatic mode SHALL still fail closed on a foreign target and SHALL NOT rewrite, join, replace, or roll back another transaction. A dead attempt SHALL NOT be reported as in progress.

Automatic update coordination SHALL use bounded atomically written state under the A1 data directory. That state MAY describe a running, prepared/activation-blocked, installed, or failed attempt, but successful installation SHALL be established only by the ordinary update transaction and an approved active cohort whose version satisfies the exact target. Prepared/activation-blocked state SHALL be bound to the exact target and valid certified immutable candidate and SHALL NOT claim active or restart-ready status. Concurrent sessions SHALL observe one owner rather than starting duplicate workers. A missing or dead worker with a stale `running` document SHALL be reconciled against its lease, transaction, prepared candidate, and approved active cohort, without treating that document as evidence of ongoing work or an installed release. Worker failures before or after lease acquisition SHALL record a bounded failure when safely attributable to that attempt. An interrupted attempt SHALL remain resumable through the existing transaction and recovery lifecycle.

A failed target SHALL use a 24-hour automatic retry cooldown for registry, package replacement, recovery, materialization, certification, warmup, and non-continuity activation failure. A candidate prepared and certified successfully but refused solely because resident continuity cannot currently be verified SHALL instead remain activation-blocked and SHALL receive bounded activation-only retries on the ordinary short observation cadence. Such a retry SHALL revalidate candidate certification, installed-target identity, prior-client eligibility, and current continuity before activation commit and SHALL NOT repeat registry lookup, npm replacement, materialization, or certification while their exact proof remains valid. A strictly newer discovered target and an explicit update command MAY attempt without waiting for either retry bound.

#### Scenario: Concurrent sessions discover one target
- **WHEN** two interactive sessions discover the same newer release at the same time
- **THEN** exactly one automatic worker SHALL own package replacement or prepared-candidate activation and the other session SHALL observe its state

#### Scenario: An explicit update overlaps automatic work
- **WHEN** `a1 update` is invoked while a live automatic worker owns installation or activation
- **THEN** the command SHALL report that an update is already in progress and SHALL NOT start a second package replacement or activation commit

#### Scenario: Automatic work overlaps another target
- **WHEN** a live update owns one target and another automatic or explicit caller requests a conflicting target
- **THEN** the conflicting caller SHALL fail safely without changing the active transaction, prepared candidate, package tree, launchers, or lease ownership

#### Scenario: A dead owner left another target behind
- **WHEN** `a1 update --develop 828` runs while the lease names a process that is not alive and the active transaction targets `0.2.7-dev.835`
- **THEN** A1 SHALL roll the `0.2.7-dev.835` transaction back to its prior verified cohort, remove the stale lease, say that the interrupted `0.2.7-dev.835` update was rolled back, and install preview 828
- **AND** an automatic worker meeting the same state SHALL fail closed without touching that transaction

#### Scenario: The automatic owner exits
- **WHEN** the worker exits after a durable update phase and its process identity is no longer live
- **THEN** a later eligible worker SHALL reconcile the lease and resume, retry activation, or roll back through the existing update recovery rules

#### Scenario: A stale running record has no owner
- **WHEN** a coordinator file still says `running` but no matching live lease or transaction remains
- **THEN** A1 SHALL NOT treat it as a live update or an installed release and SHALL safely settle its status before another eligible attempt

#### Scenario: Prepared activation is continuity-blocked
- **WHEN** npm replacement and certified candidate preparation succeed but resident continuity inspection cannot currently verify activation safety
- **THEN** A1 SHALL retain the prior verified client selection, record prepared/activation-blocked state, and retry only activation after the bounded short interval
- **AND** SHALL NOT apply the failed-install cooldown or reinstall the same exact target while its candidate proof remains valid

#### Scenario: Prepared proof is no longer valid
- **WHEN** an activation retry cannot revalidate the exact installed target or certified candidate
- **THEN** A1 SHALL refuse activation and SHALL use the ordinary safe failure or fresh preparation path rather than trusting stale prepared state

#### Scenario: The automatic attempt fails
- **WHEN** registry, worker startup, permission, package replacement, recovery, certification, warmup, or activation work other than a continuity-only refusal fails
- **THEN** A1 SHALL record bounded failed-attempt state when an attempt began, retain ordinary rollback/recovery guarantees, show no raw automatic failure popup, and avoid retrying that target during the cooldown

### Requirement: Update activation preserves a usable control path to live Agents
Automatic and explicit update SHALL verify that the candidate client can reconnect to every affected supported live profile runtime through its required authenticated control contract before committing client activation or announcing successful/restart-ready activation. Mandatory compatibility SHALL include live view, input, current controller/interaction semantics and source identity, not merely matching version/generation. The verdict SHALL be fenced/revalidated against concurrent workspace/runtime changes. Historical owner metadata whose exact recorded native process identity is provably gone SHALL NOT count as an affected live runtime merely because the record predates the current schema. A live, uninspectable, or not-provably-dead record SHALL remain a compatibility blocker.

If compatibility cannot be established, candidate preparation SHALL NOT become active client selection, a verified eligible prior client SHALL remain callable through the launcher, and live execution/data SHALL remain untouched. A certified prepared candidate blocked only on continuity MAY remain available for bounded activation-only retry, but it SHALL NOT be reported as active or restart-ready. No update SHALL require idle waits, Agent closure, state deletion, machine restart or manual session reconstruction to preserve ordinary resident access. Obsolete private-launch contracts SHALL remain ineligible.

#### Scenario: Default background update is compatible
- **WHEN** Auto prepares a candidate compatible with every affected live runtime
- **THEN** it MAY activate the updated client and announce restart readiness while all busy and idle Agents keep running unchanged

#### Scenario: Dead historical metadata remains
- **WHEN** continuity inspection encounters a schema-incomplete owner whose exact recorded process is provably gone beside supported live sources
- **THEN** that dead record SHALL NOT block candidate activation
- **AND** it SHALL remain untouched on disk

#### Scenario: Candidate cannot control a live source
- **WHEN** required source view/input/interaction semantics are unsupported or cannot be verified
- **THEN** update SHALL leave the verified usable prior client active and callable, MAY retain exact prepared proof for retry, and SHALL NOT announce restart readiness or terminate, hide or replace Agents

#### Scenario: Workspace changes during readiness inspection
- **WHEN** a new runtime or changed source/controller contract invalidates the inspected workspace before activation commits
- **THEN** activation SHALL revalidate or refuse rather than commit a stale continuity verdict

#### Scenario: Blocker clears after preparation
- **WHEN** the exact prepared candidate remains certified and the previously blocking live or uncertain source is later absent or verifiably compatible
- **THEN** activation-only retry MAY commit the candidate without another npm installation
- **AND** restart readiness SHALL appear only after that commit succeeds
