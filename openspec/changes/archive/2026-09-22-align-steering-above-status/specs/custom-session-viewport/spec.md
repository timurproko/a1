## MODIFIED Requirements

### Requirement: Working status is a transient scrollable tail
Bare A1 SHALL place its live working-status surface, including status-owned blank spacing and retry, compaction, or extension working replacements, in a non-persistent, non-selectable transient viewport tail after semantic transcript and pending steering rows. While all semantic and transient content fits above the dock, otherwise unused viewport rows SHALL precede the pending-steering and working-status group so that pending steering appears immediately above the status and the status remains immediately above the dock without moving already visible semantic transcript rows. When content overflows, that flexible alignment space SHALL be zero and the same steering and working surfaces SHALL participate in normal viewport scrolling. The surfaces SHALL NOT be duplicated in the dock, converted into persisted conversation content, counted as completed assistant messages, or treated as submitted prompts.

Pending steering and working rows SHALL contribute to overflow, scrollbar geometry, and end-following navigation while present. While detached, new transcript output, queue updates, and status animation, replacement, or removal SHALL preserve the current transcript position unless the new extent requires clamping to a valid scroll position. Removing transient rows SHALL remove their owned spacing and leave no stale copy. Failure messages SHALL retain their existing placement; idle informational messages are governed by the transient dock notice requirement. The pinned `a1 pi` route SHALL retain its existing presentation and behavior.

#### Scenario: Scroll the active indicator out of view
- **WHEN** the viewport overflows with pending steering or live working rows present and the reader scrolls toward older content
- **THEN** the viewport SHALL detach and those transient rows SHALL move with the scrollable content
- **AND** each row SHALL disappear once its actual position leaves the viewport
- **AND** no pinned copy or reserved dock row for either surface SHALL remain
- **AND** the editor and footer SHALL stay pinned

#### Scenario: Return to active work
- **WHEN** the reader scrolls to the end, presses `Ctrl+End` in the ordinary prompt context, or activates jump-to-bottom while transient rows remain present
- **THEN** the viewport SHALL follow the complete current tail, including pending steering and working status
- **AND** those rows SHALL be visible to the extent allowed by the viewport height
- **AND** the jump-to-bottom control SHALL disappear as following resumes

#### Scenario: Cross the fit boundary
- **WHEN** growing content exhausts the flexible space and then exceeds the rows available above the dock
- **THEN** the one working-status surface SHALL remain the final transient viewport surface without duplication or omission
- **AND** end following SHALL advance the overflowing viewport while keeping the pending-steering and working-status group visible immediately above the dock
- **AND** the editor/footer position SHALL NOT change solely because of that boundary crossing

#### Scenario: Update status while detached
- **WHEN** pending steering changes, working animation ticks, or the status is replaced by retry, compaction, or extension working content while the reader is detached
- **THEN** the reader's transcript position SHALL remain unchanged whenever it is still valid
- **AND** the newest transient content SHALL appear at the tail if the reader returns while it remains active
- **AND** an off-screen update SHALL NOT paint either surface over the visible transcript or dock

#### Scenario: Finish work while detached
- **WHEN** the lifecycle removes the working status while the reader is away from the tail
- **THEN** the status and its owned alignment spacing SHALL disappear from viewport extent without leaving historical or pinned remnants
- **AND** the viewport SHALL preserve the current transcript position when valid, otherwise clamp to the new end and resume following there
- **AND** returning to the end SHALL NOT resurrect the finished indicator

#### Scenario: Copy near the live tail
- **WHEN** a transcript selection extends toward pending steering, working-status, or status-owned alignment rows and is copied
- **THEN** copied and highlighted content SHALL stop at the semantic transcript boundary
- **AND** steering text, its edit hint, status text, spinner, and alignment spacing SHALL be excluded

#### Scenario: Keep queue and editor behavior independent
- **WHEN** pending steering rows are visible or scrolled out of view while widgets, a replacement input, or a footer update is present
- **THEN** their existing queue lifecycle and `Alt+Up` edit action SHALL remain available
- **AND** changing their placement SHALL NOT convert them into persisted transcript messages
- **AND** widgets, the input surface, and the footer SHALL retain their established lifecycle, focus, and input handling

#### Scenario: Reset or replace the session
- **WHEN** a session is reset, replaced, or disposed while transient steering or working rows are visible or off-screen
- **THEN** no such rows, alignment spacing, scroll extent, pointer suppression, or stale painting from that session SHALL survive into the next session

#### Scenario: Keep a fitting status above the input
- **WHEN** live work begins or updates while semantic transcript, pending steering, and working rows all fit above the dock
- **THEN** pending steering rows and their edit hint SHALL appear immediately above the working-status surface
- **AND** the working-status surface SHALL appear immediately above the dock
- **AND** unused rows SHALL remain between semantic transcript content and the steering/status group
- **AND** existing semantic transcript rows and the editor/footer group SHALL remain at their current terminal rows

#### Scenario: Grow content while it still fits
- **WHEN** streamed content consumes one or more previously unused rows while the complete viewport content still fits
- **THEN** the flexible space before the pending-steering and working-status group SHALL shrink by the consumed rows
- **AND** the steering/status group and pinned dock SHALL remain at their current terminal rows
- **AND** no follow scroll SHALL occur solely to keep the fitting group visible

#### Scenario: Suppress pointer sequences begun on transient rows
- **WHEN** a pointer sequence begins on pending steering, working-status, or status-owned alignment rows outside a viewport control
- **THEN** the complete pointer sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** wheel input over those rows SHALL retain ordinary viewport scrolling
