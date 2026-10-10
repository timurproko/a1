## ADDED Requirements

### Requirement: The terminal host and the session presenter are separate owners
One terminal host per process SHALL own the terminal runtime, damage-aware presentation, pointer reporting, owned-route overlays, quit presentation, and terminal restoration, and SHALL hold exactly one active session presenter. A session presenter SHALL own one engine session, its transcript root, editor, controllers, and dialogs, and SHALL reach the terminal only through the host handle. Attaching a presenter SHALL invalidate the retained presentation so its first frame is a full paint, and render requests from a presenter that is not active SHALL NOT paint.

#### Scenario: The single-session product starts
- **WHEN** bare `a1` or `a1 pi` starts
- **THEN** composition SHALL create one host and one presenter and the rendered frames SHALL be identical to the frames before the split

#### Scenario: A second presenter is attached
- **WHEN** the host attaches a different presenter
- **THEN** the next frame SHALL be a full paint of that presenter and later frames SHALL use incremental damage within the new epoch

#### Scenario: An inactive presenter receives engine events
- **WHEN** a presenter that is not active applies transcript events
- **THEN** its root state SHALL update and no terminal write SHALL occur
