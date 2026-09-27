## MODIFIED Requirements

### Requirement: History uses a compact numeric border label
While bare A1 is recalling saved prompt history, the existing history border label SHALL show its position/total without the literal `History` title, for example `1/100`. Its four-cell inset, dim color, count calculation, visibility, clipping, and border width SHALL remain unchanged. When recalled input has hidden lines above the visible editor body, the upper overflow cue SHALL NOT be appended to the history label or separated from it by a dot. Instead, the overflow cue SHALL use the same centered placement, `↑ N more` wording, and current border color as the corresponding lower `↓ N more` cue, while the history position remains independently left-aligned. If the available width cannot show both labels without overlap, the border SHALL preserve a complete width-safe overflow cue rather than merge or interleave the two labels. This presentation change SHALL NOT alter history navigation, draft restoration, storage, editor scrolling, or input geometry.

#### Scenario: Recall and leave saved history
- **WHEN** the user navigates saved prompt history
- **THEN** the border SHALL show the existing position/total without `History`, in the same position and dim color
- **AND** the history counter SHALL have no trailing dot or separator
- **AND** leaving recall SHALL remove the indicator and restore the draft as before

#### Scenario: Scroll within a recalled multiline prompt
- **WHEN** recalled input has hidden lines above the visible editor body and the border is wide enough for both annotations
- **THEN** the compact history position SHALL remain at its left inset
- **AND** `↑ N more` SHALL be centered independently in the top border using the border color, matching the lower overflow cue's placement and wording
- **AND** neither annotation SHALL be appended to or styled as part of the other

#### Scenario: Render both annotations at a narrow width
- **WHEN** the history and upper overflow labels cannot fit without overlapping
- **THEN** the border SHALL remain within the available width and SHALL NOT merge, interleave, or partially join the labels
- **AND** it SHALL retain a complete width-safe upper overflow cue
