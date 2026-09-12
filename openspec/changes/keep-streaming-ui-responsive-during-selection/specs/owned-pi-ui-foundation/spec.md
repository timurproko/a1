## ADDED Requirements

### Requirement: Built-in tool preview preparation does not obstruct interaction
Bare A1 SHALL keep built-in tool presentation preparation bounded by eligible content presentations rather than every arriving argument or result chunk. Semantic tool state, execution, outcomes, and engine events SHALL remain current independently of visual coalescing. Selection, wheel scrolling, typing, and visible status changes SHALL NOT repeat unchanged built-in content highlighting or formatting, including content hidden behind a collapsed preview.

The collapsed write preview SHALL preserve the pinned text, line count, syntax colors, and partial/final distinctions. Expanding it SHALL expose the exact complete content while later input remains serviceable. Expensive content-sized preparation SHALL NOT execute as an unbounded interaction task. Opaque extension renderers SHALL retain their established callback, invalidation, and lifecycle behavior; the optimization SHALL NOT assume they are pure or alter comparison profiles or installed Pi packages.

#### Scenario: Stream more chunks than can be presented
- **WHEN** several built-in tool argument or result revisions arrive before the next eligible content presentation
- **THEN** only the newest eligible revision SHALL require visual preparation for that presentation
- **AND** semantic tool state and execution SHALL not wait for visual preparation

#### Scenario: Revisit an unchanged collapsed block
- **WHEN** selection, wheel scrolling, typing, or status changes revisit an unchanged prepared collapsed tool block
- **THEN** its source content SHALL not be highlighted or formatted again solely because of the interaction
- **AND** its existing preview, hint, and source styling SHALL remain exact

#### Scenario: Complete a tool during interaction
- **WHEN** a tool finishes while partial presentation and pointer or keyboard input are pending
- **THEN** the final semantic state SHALL supersede the partial immediately and become eligible for presentation without the old stream delay
- **AND** no delayed partial or stale preparation result SHALL overwrite that final state
- **AND** unchanged call content SHALL not be fully prepared repeatedly for unrelated lifecycle fields

#### Scenario: Preserve preview and expansion fidelity
- **WHEN** write content includes multiline syntax, trailing blank lines, tabs, wide or combining characters, path-like text, or long wrapped lines
- **THEN** partial, final, collapsed, and expanded output SHALL match the pinned built-in presentation at equivalent state and geometry
- **AND** requesting expansion SHALL not block subsequent selection, scrolling, or keyboard handling while expensive preparation completes

#### Scenario: Replace presentation inputs during preparation
- **WHEN** content is replaced rather than appended, the theme or expansion changes, or the block or session is removed while preparation is pending
- **THEN** only results matching the current block, content, and presentation identity SHALL be eligible to appear
- **AND** stale work SHALL not resurrect removed content or apply old colors
- **AND** retained preparation resources SHALL remain bounded and be released on disposal

#### Scenario: Keep opaque extensions and comparisons unchanged
- **WHEN** an extension supplies an opaque renderer or an explicit comparison profile is used
- **THEN** its established renderer callback sequence, lifecycle, and visible behavior SHALL remain unchanged
- **AND** the owned optimization SHALL not mutate installed dependency files or infer private renderer state

### Requirement: Input priority preserves content and animation progress
Bare A1 SHALL distinguish accepted input, applied semantic state, prepared visual content, and presented state. An input receipt that does not present a pending content revision SHALL NOT acknowledge or cancel that revision's only presentation opportunity. Continuous input SHALL retain immediate current-state feedback without indefinitely deferring due content or visible working animation.

At most one latest pending interaction presentation and one latest pending visual revision per active content block SHALL be retained rather than an unbounded backlog of frames. Input barriers, completion, and terminal teardown SHALL preserve their ordering and supersession rules. Timed indicators SHALL show current lifecycle state without replaying a backlog of obsolete animation frames. An off-screen indicator SHALL not be made visible to claim progress.

#### Scenario: Receive no-op motion while content is pending
- **WHEN** content is waiting for presentation and repeated mouse reports cause no visible interaction change
- **THEN** the content's presentation opportunity SHALL remain pending and execute
- **AND** those reports SHALL not repeatedly move its due time later

#### Scenario: Interact continuously while working
- **WHEN** selection, wheel, or keyboard input continues across multiple content and visible animation deadlines
- **THEN** input feedback, due content, and visible animation SHALL all make progress before the input burst ends
- **AND** no stream of older frames SHALL delay the newest input state

#### Scenario: Display interaction over prepared content
- **WHEN** immediate input can be painted using current prepared content while newer content preparation remains pending
- **THEN** the interaction SHALL be presented against its corresponding displayed geometry
- **AND** newer content SHALL remain pending until a presentation actually represents it
- **AND** that later presentation SHALL retain the newest applied interaction state

#### Scenario: Stop during pending presentation
- **WHEN** the session is replaced or stopped while interaction, content, or preparation is pending
- **THEN** old-session work SHALL be canceled or rejected by identity
- **AND** no late frame SHALL write over the replacement session or restored terminal

### Requirement: Joint interaction responsiveness has integrated evidence
Responsiveness evidence SHALL exercise real built-in tool presentation while selection, wheel scrolling, keyboard input, and working animation compete. It SHALL compare stream-only, interaction-only, and combined workloads, including a collapsed 258-line write preview, a larger 2,000-line case, cold/warm preparation, a long single line, and equivalent visible content with short and long settled histories. Selection and wheel scrolling SHALL be tested separately as well as in combination.

Evidence SHALL distinguish requests from actual frames and record bounded preparation, composition, presented-revision, pending-state, timer, terminal-paint, and fallback-reason data. Deterministic ordering, reuse, fairness, exact output, and paint budgets SHALL gate correctness; diagnostic wall-clock measurements SHALL not be the sole automated verdict. Equivalent independent bare A1, `a1 pi`, and untouched pinned-Pi producers SHALL remain separate, and terminal-owned regular-mode selection SHALL not be reported as the same mechanism as owned fullscreen selection.

#### Scenario: Exercise the joint workload matrix
- **WHEN** the responsiveness matrix runs at representative geometries including 120x30 and 192x54
- **THEN** it SHALL include selection-only and wheel-only interaction during write generation and completion, rapid wheel direction reversal at edges, every configured scrollbar speed, retained selections, detached reading, and return to the live tail
- **AND** it SHALL verify exact scroll position, follow state, selected cells, copied text, preview/expansion output, and newest final content

#### Scenario: Detect repeated preparation or presentation starvation
- **WHEN** a combined workload repeats unchanged hidden-content preparation, copies off-screen history for selection feedback, starves due content or animation, or presents an obsolete endpoint or scroll position
- **THEN** the deterministic evidence gate SHALL fail
- **AND** the failure SHALL identify the responsible phase rather than report only final screenshot equality

#### Scenario: Detect unnecessary scroll repaint
- **WHEN** an ordinary wheel or selected-follow transition has proven safe overlapping row movement
- **THEN** terminal evidence SHALL fail unnecessary full-screen clears or repaint of unchanged overlapping transcript and dock rows
- **AND** unsafe transitions SHALL report their conservative fallback reason and still pass exact-cell and selection correctness checks

#### Scenario: Accept the exact candidate physically
- **WHEN** the exact built candidate is reviewed in Windows Terminal beside the independent comparison profiles
- **THEN** selection and wheel movement SHALL start and reverse promptly and stop without catching up through stale positions
- **AND** the visible spinner and ongoing content SHALL not stall because the user is interacting
- **AND** the terminal version, geometry, viewport settings, separate selection/wheel/typing latency distributions, spinner gaps, content freshness, and acceptance result SHALL be recorded

#### Scenario: Physical results contradict automated evidence
- **WHEN** selection or wheel scrolling still varies noticeably between smooth and laggy during the declared active-agent workload despite passing deterministic tests
- **THEN** the change SHALL remain unaccepted until the discrepancy is explained and corrected
- **AND** freezing output, clearing selection, changing wheel distance, slowing the spinner, or suppressing work SHALL not count as a fix
