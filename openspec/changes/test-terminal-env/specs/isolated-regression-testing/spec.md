## ADDED Requirements

### Requirement: Tests see a neutral terminal identity
Automated tests SHALL run with no inherited terminal-identity or terminal-capability override variables, so terminal capability detection gives the same result on a developer machine as in continuous integration. A test that depends on a particular terminal SHALL set that terminal's variables itself.

#### Scenario: Tests run from a capability-rich terminal
- **WHEN** a developer runs the test suite from a shell that sets `TERM_PROGRAM=ghostty`, `WT_SESSION`, or another terminal-identity variable
- **THEN** every test worker and every process it starts SHALL see none of those variables
- **AND** the rendering, link, paste and settings tests SHALL produce the same results as in continuous integration
