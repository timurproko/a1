## 1. Image limit message names the real setting

- [x] 1.1 `ImageAttachmentError` takes an optional configurable flag; the hint reads "To change it: Ctrl+P → Settings → Agent → Prompt image limit." and is omitted otherwise
- [x] 1.2 `PromptChipStore` marks errors configurable only when given the settings-driven image limit
- [x] 1.3 Tests cover both message forms and reject the `/settings` wording

## 2. Fork prompt explains a session open in another process

- [x] 2.1 The fork-prompt request gains `reason: "open-elsewhere"`, passed from the `SessionWriterConflict` path
- [x] 2.2 The console prompt prints "Session is open in another A1 process." for that reason
- [x] 2.3 Tests cover the new header and keep the cross-project and missing-folder texts

## 3. Prompt-history border counter reads History N/M

- [ ] 3.1 `renderTopBorder` in `editor-core.ts` prefixes the counter with `History ` in both the plain and overflow-cue branches, without moving source lines
- [ ] 3.2 The `editor-core.ts` header, ledger entry (modifications, `localSha256`, `compact-history-counter-label` deviation) and history-editor provenance doc describe the labelled counter
- [ ] 3.3 Core and shell history-editor tests expect `History 100/100`, `History 1/100` and `History 1/1` in the dim label style

## 4. README and CI comment match the code

- [ ] 4.1 README navigator lists Session colors and Uninstall in section order
- [ ] 4.2 README names the Update setting value Manual instead of No
- [ ] 4.3 The `ci.yml` startup-budget comment says nightly and Full regression only record an overrun
