## 1. Image limit message names the real setting

- [ ] 1.1 `ImageAttachmentError` takes an optional configurable flag; the hint reads "To change it: Ctrl+P → Settings → Agent → Prompt image limit." and is omitted otherwise
- [ ] 1.2 `PromptChipStore` marks errors configurable only when given the settings-driven image limit
- [ ] 1.3 Tests cover both message forms and reject the `/settings` wording

## 2. Fork prompt explains a session open in another process

- [ ] 2.1 The fork-prompt request gains `reason: "open-elsewhere"`, passed from the `SessionWriterConflict` path
- [ ] 2.2 The console prompt prints "Session is open in another A1 process." for that reason
- [ ] 2.3 Tests cover the new header and keep the cross-project and missing-folder texts

## 3. README, prompt-history docs and CI comment match the code

- [ ] 3.1 README navigator lists Session colors and Uninstall in section order
- [ ] 3.2 README names the Update setting value Manual instead of No
- [ ] 3.3 Prompt-history docs show the border counter as `100/100` and `1/100`
- [ ] 3.4 The `ci.yml` startup-budget comment says nightly and Full regression only record an overrun
