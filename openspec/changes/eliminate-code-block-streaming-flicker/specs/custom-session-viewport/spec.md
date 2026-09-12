## ADDED Requirements

### Requirement: Streamed code and link-bearing content keeps bounded viewport painting
While bare A1 follows the transcript end, content that merely looks like a link SHALL NOT change how the viewport is painted. Text a terminal host might underline on hover, including dotted identifiers, file names, and relative or drive-qualified paths, SHALL NOT by itself disqualify a transcript transition that the owned semantic frame has already proved safe, and SHALL NOT cause the complete screen to be cleared.

An ordinary streamed frame SHALL NOT clear the complete screen. A full-screen clear SHALL remain limited to initial entry, structural reset, resize, and image-protocol cases. A frame that must overwrite stale terminal link decoration SHALL repaint the rows carrying that decoration rather than erasing and republishing every row.

A live transcript block that legitimately re-renders its own rows, such as a fenced code block, a table, or a rewrapped paragraph, SHALL continue to use bounded transcript movement plus the rows it genuinely damaged. Settled rows outside that block SHALL NOT be cleared or rewritten because the live block changed.

A row carrying an explicit terminal hyperlink, an unclosed escape, or other content that cannot be replayed safely SHALL keep its existing conservative treatment and SHALL fail closed to the pinned renderer's own output.

#### Scenario: Stream a fenced code block while following
- **WHEN** an assistant message streams a fenced code block containing file paths and dotted identifiers into an overflowing followed transcript
- **THEN** each followed transition SHALL use bounded transcript movement plus the rows the code block genuinely changed
- **AND** no frame between the first chunk and the settled message SHALL clear the complete screen
- **AND** settled transcript rows above the streaming block SHALL NOT be cleared or rewritten

#### Scenario: Stream prose containing a file path
- **WHEN** streamed prose adds a row containing a file name or relative path to a followed overflowing transcript
- **THEN** the viewport SHALL advance by bounded movement rather than a full positional rewrite
- **AND** the presence of the path-like text alone SHALL NOT be treated as a reason to reject the movement

#### Scenario: Stream a live block taller than the stable slack
- **WHEN** the live tail occupies more visible rows than a settled frame's ordinary damage slack and every one of its rows changes in a streamed update
- **THEN** the frame SHALL repaint the live tail and the rows exposed by the movement
- **AND** the frame SHALL NOT fall back to rewriting stable transcript rows

#### Scenario: Move a real hyperlink under a stationary pointer
- **WHEN** a followed frame moves a row carrying an explicit terminal hyperlink away from a stationary pointer
- **THEN** the existing hover-cleanup behavior SHALL still repair stale host link decoration
- **AND** that repair SHALL remain bounded to the rows whose decoration must be overwritten
