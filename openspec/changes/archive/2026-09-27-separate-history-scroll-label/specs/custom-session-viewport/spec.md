## MODIFIED Requirements

### Requirement: History uses a compact numeric border label
While bare A1 is recalling saved prompt history, the existing history border label SHALL show its position/total without the literal `History` title, for example `1/100`. Its four-cell inset, dim color, count calculation, visibility, clipping, and border width SHALL remain unchanged. When recalled input has hidden lines above the visible editor body, the upper overflow cue SHALL NOT be appended to the history label or separated from it by a dot. Instead, the overflow cue SHALL use the same centered placement, `↑ N more` wording, and current border color as the corresponding lower `↓ N more` cue, while the history position remains independently left-aligned and visible. If centered placement would overlap the history position, the overflow cue SHALL move right only as far as needed when both complete labels fit. If both complete labels cannot fit, the border SHALL preserve the history position and omit the overflow cue rather than replace, merge, interleave, or partially join the labels. This presentation change SHALL NOT alter history navigation, draft restoration, storage, editor scrolling, or input geometry.

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
- **WHEN** centered overflow placement would overlap the history position but both complete labels fit on the border
- **THEN** the history position SHALL remain at its left inset and the complete overflow cue SHALL shift right only far enough to avoid it
- **AND** the border SHALL remain within the available width without merging, interleaving, or partially joining the labels

#### Scenario: Render a border too narrow for both annotations
- **WHEN** the complete history position and upper overflow cue cannot both fit on the border
- **THEN** the history position SHALL remain visible at its left inset
- **AND** the overflow cue SHALL be omitted for that frame rather than replacing or partially joining the history position
