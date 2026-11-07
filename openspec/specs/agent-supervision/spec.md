# Agent Supervision Specification

## Purpose

Defines immutable release cohorts, negotiated control contracts, durable process generations, and exclusive foreground-terminal lease supervision.

## Requirements

### Requirement: No background process coordinates A1 launches
A1 SHALL NOT start a detached supervisor or keep any background process after the terminal session ends, other than an installer worker performing an update; independent `a1` processes SHALL coordinate only through the session writer guard and the durable update transaction.

#### Scenario: Several launches run independently
- **WHEN** two `a1` processes run at the same time
- **THEN** each SHALL run its own UI without contacting a supervisor or control endpoint
- **AND** a session open in one SHALL be refused as a writer by the other
