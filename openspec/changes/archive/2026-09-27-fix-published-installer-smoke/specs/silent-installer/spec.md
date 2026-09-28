## ADDED Requirements

### Requirement: Activation transcript framing preserves complete events within fixed memory bounds
The installer SHALL split child-process output into complete newline-delimited activation events before applying a fixed bound to an unresolved trailing fragment. It SHALL deliver every complete event intact even when one received chunk exceeds the diagnostic retention limit. Retained stdout, stderr, and unterminated fragments SHALL remain bounded, and malformed, unknown, or truncated activation evidence SHALL continue to fail installation.

#### Scenario: One chunk contains more than the diagnostic window of valid events
- **WHEN** activation emits a single received chunk containing more than 8 KiB of complete newline-delimited JSON events
- **THEN** the installer SHALL parse every complete event without corrupting the first line
- **AND** successful completion evidence SHALL remain eligible

#### Scenario: An activation event spans chunks
- **WHEN** one valid activation event ends in a later child-process chunk
- **THEN** the installer SHALL retain and reassemble its bounded partial line before parsing it

#### Scenario: A child emits an oversized unterminated line
- **WHEN** activation output exceeds the fragment bound without a newline
- **THEN** retained memory SHALL remain bounded
- **AND** the output SHALL fail strict activation validation rather than being accepted as success
