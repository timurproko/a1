## ADDED Requirements

### Requirement: Link inspection separates movement risk from hover cleanup
Row inspection used by owned damage-aware presentation SHALL report explicitly declared terminal hyperlinks separately from text that only resembles a link. Explicit hyperlinks and content that cannot be replayed safely SHALL restrict movement, because the terminal holds per-cell link identity that bounded region movement can misattribute. Text that only resembles a link SHALL restrict nothing beyond the host-hover decoration repair it was introduced for.

Owned presentation SHALL NOT request a whole-screen cleanup because streamed content changed a row that contains link-resembling text. Cleanup SHALL remain driven by pointer-hover transitions, deliberate link removal, and discarded link state, and a cleanup frame SHALL repaint the affected rows without an undeclared erase-display.

The inspector SHALL remain a conservative cleanup detector. It SHALL NOT become a link-activation parser, SHALL NOT infer transcript semantics, and SHALL NOT change the bytes any row emits.

#### Scenario: Inspect a row of ordinary code
- **WHEN** a transcript row contains dotted identifiers, file names, or relative paths but no declared terminal hyperlink
- **THEN** the row SHALL be reported as carrying no explicit hyperlink
- **AND** it SHALL NOT restrict a proven safe transcript transition

#### Scenario: Inspect a row with a declared hyperlink
- **WHEN** a transcript row carries an explicit terminal hyperlink sequence
- **THEN** the row SHALL be reported as explicitly linked
- **AND** existing conservative movement and cleanup treatment SHALL apply unchanged

#### Scenario: Stream over link-resembling text
- **WHEN** a streamed update changes a followed row whose text resembles a link
- **THEN** no whole-screen cleanup SHALL be requested by that content change
- **AND** the frame SHALL remain eligible for bounded movement

### Requirement: The real-damage allowance follows the declared live tail
The owned semantic frame SHALL declare how many visible rows belong to the currently streaming transcript block. The damage-aware adapter SHALL derive its allowed painted-row count from the declared transcript movement, that live-tail extent, the existing stable-boundary allowance, and the dock rows it already counts, rather than from a fixed slack that assumes a one-row live tail.

Painting more rows than that allowance SHALL continue to fail closed to the pinned renderer's own write. A frame whose live-tail extent is unavailable SHALL fall back to the existing fixed allowance rather than assume a larger one. Rows the frame attributes to settled content SHALL remain subject to the existing stable-row limit, so a stable-row regression still fails.

#### Scenario: Repaint a tall live block
- **WHEN** the declared live tail occupies several visible rows and every one of them changes in one streamed update
- **THEN** the adapter SHALL transform the frame into bounded movement plus those rows
- **AND** it SHALL NOT report excessive damage for the block's own legitimate rows

#### Scenario: Repaint settled rows
- **WHEN** a frame would paint settled transcript rows beyond the movement, the live tail, and the stable-boundary allowance
- **THEN** the adapter SHALL report excessive damage
- **AND** it SHALL forward the original pinned write unchanged

#### Scenario: Compose a frame without a declared live tail
- **WHEN** the semantic frame does not declare a live-tail extent
- **THEN** the adapter SHALL apply the existing fixed allowance
- **AND** it SHALL NOT widen its transformation on unknown metadata

### Requirement: Rendering evidence covers code and link-bearing streaming
Deterministic rendering evidence SHALL include streamed fenced code, streamed prose containing file paths and dotted identifiers, and a live tail taller than the stable-row slack, each driven through the existing independent producer and cell-replay support at a declared geometry.

Their budgets SHALL fail on a full-screen clear between the first streamed chunk and the settled message, on rejection of a movement the semantic frame proved safe when the only disqualifying input was link-resembling text, on repaint of stable settled rows, and on a stale final frame. Evidence SHALL record the bounded decision cause for every checkpoint so a fallback is attributable.

#### Scenario: Run the code-block workload
- **WHEN** the rendering evidence runs the streamed fenced-code workload for bare A1
- **THEN** it SHALL report the decision cause and painted-row count at every checkpoint
- **AND** the budget SHALL fail if any mid-stream frame clears the complete screen

#### Scenario: Run a comparison producer over the same workload
- **WHEN** `a1 pi` or untouched pinned Pi renders the same workload
- **THEN** the owned damage adapter SHALL not be active
- **AND** the comparison producer's terminal writes SHALL remain unchanged
