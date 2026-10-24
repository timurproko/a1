# launch-instance-lifecycle Delta

## ADDED Requirements

### Requirement: A development launch's checkout processes end with it
A repository-local development launch (`./scripts/dev`) SHALL stop every process running this checkout's code when the launch exits, and a rebuild or clean of the checkout SHALL do the same before replacing built files, unless `A1_DEV_KEEP_PROCESSES=1` opts out. Stopping SHALL repeat list-and-terminate passes until no such process remains or a bounded number of passes is reached, SHALL print nothing when it succeeds, and SHALL name the surviving process ids when it does not. Processes of other checkouts and of installed releases SHALL NOT be touched.

#### Scenario: Resident roles restart each other during a stop
- **WHEN** a development instance's holder restarts its server, or the server restarts a holder, while the checkout is being stopped
- **THEN** the stop SHALL continue until a pass finds no process of this checkout, and SHALL report nothing

#### Scenario: Development launch exits
- **WHEN** the user leaves a `./scripts/dev` session
- **THEN** no supervisor, resident server, holder, or tab process of that checkout SHALL remain running

#### Scenario: A process survives every pass
- **WHEN** a process of this checkout cannot be terminated within the bounded passes
- **THEN** the stop SHALL print one line naming the surviving process ids and SHALL continue the build or launch
