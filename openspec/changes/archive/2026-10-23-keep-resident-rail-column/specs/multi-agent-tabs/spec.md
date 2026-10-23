## ADDED Requirements

### Requirement: Resident scrollbar rail keeps its gutter column

The resident tab presentation SHALL draw every scrollbar track and thumb cell in the same final gutter column that solo mode uses, on every viewport row, including rows where a jump-to-bottom control, a live-status row, or streamed content previously appeared.

#### Scenario: Rail survives a moved bottom control

- **WHEN** a resident tab scrolls away from the end, shows the jump-to-bottom control, and then returns to the end so the control disappears
- **THEN** the row that held the control shows its rail cell in the final gutter column and no rail cell one column to its left

#### Scenario: Rail survives streamed rows under Windows ConPTY

- **WHEN** a resident child streams rows and hovers or drags the rail while Windows ConPTY re-renders its output
- **THEN** the retained resident rows match a complete capture of the child terminal and every rail cell stays in the gutter column
