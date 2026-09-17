## MODIFIED Requirements

### Requirement: Bare A1 quit plays a bounded outro and reveals a clean parent terminal
When an interactive bare-A1 session quits through `/quit`, the second `Ctrl+C` of the clear/exit chord, `Ctrl+D`, or an extension shutdown request while `quitAnimation` is `true`, A1 SHALL capture the last frame presented on its fullscreen surface, play the selected quit effect over that frame on the alternate screen, and only then leave the alternate screen exactly once. Playback SHALL be bounded by the configured duration, clamped to 300–2000 ms, and SHALL paint each tick inside one synchronized-output block. The parent terminal SHALL receive no A1 frame rows, no conversation transcript, and no alternate-screen residue after restoration; only the existing dim resume hint MAY follow. When `quitAnimation` is `false`, A1 SHALL neither capture a frame nor play an effect and SHALL leave the alternate screen immediately. A playback failure, a non-TTY terminal, the pinned regular mode, or an all-blank capture SHALL likewise skip the outro without changing restoration, exit output, or process completion. The pinned `a1 pi` comparison profile SHALL remain unchanged.

#### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from a bare-A1 session showing a conversation
- **THEN** the presented frame SHALL animate with the configured effect on the alternate screen for the configured duration
- **AND** the alternate screen SHALL be left exactly once after playback completes
- **AND** the parent terminal SHALL contain only its prior scrollback and the dim resume hint

#### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL play the same outro and produce the same clean restoration as `/quit`

#### Scenario: Exit animation is switched off
- **WHEN** `quitAnimation` is `false` and the user quits through any interactive route
- **THEN** A1 SHALL leave the alternate screen without capturing a frame or writing any outro paint
- **AND** no frame the renderer still has queued SHALL reach the terminal between the quit request and the leave
- **AND** restoration, the resume hint, and successful process completion SHALL be unchanged
- **AND** the stored `quitEffect` and `quitEffectDurationMs` SHALL be ignored for that quit

#### Scenario: Effect is off or playback cannot run
- **WHEN** `quitAnimation` is `false`, stdout is not a TTY, the runtime is not fullscreen, the captured frame has no visible cells, or the player fails
- **THEN** A1 SHALL leave the alternate screen without animating
- **AND** restoration, the resume hint, and successful process completion SHALL be unchanged

#### Scenario: Playback stays bounded
- **WHEN** the configured duration is below 300 ms or above 2000 ms, or the terminal writes slowly
- **THEN** playback SHALL clamp to the 300–2000 ms range and SHALL NOT delay the alternate-screen leave beyond that clamp and one bounded guard
- **AND** no outro paint SHALL be written after the alternate-screen leave

#### Scenario: Effects are deterministic
- **WHEN** the same effect, row widths, and seed are planned twice
- **THEN** both plans SHALL contain identical sparkle and clear cells in identical order
- **AND** every sparkle and clear cell SHALL lie inside the captured frame's row and column bounds
- **AND** every visible cell of the captured frame SHALL be cleared by the end of the plan
