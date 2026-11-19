## 1. Process-only requirements removed

- [x] 1.1 Remove acceptance-evidence, physical-terminal review and phase-gate requirements from `owned-pi-ui-foundation` and `custom-session-viewport`
- [x] 1.2 Remove acceptance-only requirements and paragraphs from `persistent-prompt-history`, `contextual-prompt-suggestions` and `pi-settings-runtime`
- [x] 1.3 Reduce the `pi-api-boundary` upgrade requirement to its presentation-independence, provenance and baseline rules

## 2. Superseded and duplicated requirements removed

- [x] 2.1 Remove `owned-pi-ui-foundation` requirements that a more specific capability states, naming the keeper in each Migration line
- [x] 2.2 Remove the superseded submitted-prompt copy rule from `session-frame-selection` and the transcript-clipping rule from `custom-session-viewport`
- [x] 2.3 Remove consumer-side scenarios from `session-color-control` and the finished migration scenario from `ui-apps`

## 3. Requirements corrected to the code

- [x] 3.1 State the marker-free main prompt, the numeric history counter and editor-owned prompt drags
- [x] 3.2 State the Launcher route to Settings, Changelog and Hotkeys and the real settings sections
- [x] 3.3 State the `Update` setting's `Auto` and `Manual` choices and the Default color and Current color settings
- [x] 3.4 Correct the reference-screen footer, the Settings search hint and the dock-notice rules

## 4. Phase and history wording replaced

- [x] 4.1 Rename requirements and scenarios whose names described a change, a phase or an earlier product generation
- [x] 4.2 Replace relocation, migration and "previous behaviour" narration with present-tense statements

## 5. Deltas verified to apply

- [x] 5.1 Validate the change strictly and check that every Migration line names a requirement that exists after the change
- [x] 5.2 Apply the deltas in a scratch copy and run the governance checks on the resulting tree
