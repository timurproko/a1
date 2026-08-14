# Manual one-pane terminal-host result

## First manual artifact

- Artifact: `native/terminal-host/target/debug/addone-terminal-host.exe`
- SHA-256: `8d81db199687a9b8f195b4e40cb4b235de3ea00ffeb9cf55f9c64b1b3582cbba`
- Size: 2,214,912 bytes
- User-controlled run: one fullscreen `cmd.exe` pane inside Windows Terminal

The user reported that typing commands, cursor movement, colors, Windows Terminal resize, and fast output worked correctly.

The first artifact had one finding: `Ctrl+Shift+Q` did not exit.

## Corrective artifact

- Corrective artifact SHA-256: `1025a0823114477b7ab311ef55098647fc337b98a9194cf389fc124a047360bf`
- Size: 2,227,712 bytes
- Correction: accept `Ctrl+Q` or `Ctrl+Shift+Q`, including uppercase key delivery.
- Correction: resolve Windows command shims through generic PATH/PATHEXT lookup; `pi` resolves to `C:\Users\tprokopiev\AppData\Roaming\npm\pi.cmd`.
- Automated non-interactive result after correction: build, version/provenance, terminal model, PTY start, process exit, and cleanup passed.

## Follow-up artifact

- Artifact SHA-256: `b083af60eb8c4ca90438e4022c4e6d10b1410dda5554f554a8b814ba2cdee291`
- Size: 2,238,464 bytes
- Removed the host-owned quit shortcut so `Ctrl+Q` no longer intercepts input.
- Added generic calling-shell ancestry detection; this Git Bash environment resolves to `C:\Program Files\Git\usr\bin\bash.exe --login -i`.
- Disabled mouse capture by default so the outer terminal can provide native selection.
- Added `Shift+PageUp`/`Shift+PageDown` and `Shift+Up`/`Shift+Down` host scrollback.
- Non-interactive terminal model and PTY cleanup probes pass.

## Theme-preservation artifact

- Artifact SHA-256: `9989373d1ee28ac42bf7a6b1be02d68b92c23b71f14336db493a93d76df48198`
- Size: 2,238,464 bytes
- The frame composer now emits the outer terminal's default foreground/background for unstyled cells instead of forcing black.
- The automated probe asserts the default-background sequence and passes.

## Palette-preservation artifact

- Artifact SHA-256: `203219f0ee79f3086467dccb5479b5749b09f8bac79623f84682545d374ba2f4`
- Size: 2,238,976 bytes
- Palette-indexed child colors are emitted as palette indexes (`38;5;n` / `48;5;n`) instead of being converted through Ghostty's default RGB palette.
- The automated probe asserts default-background and palette-passthrough sequences and passes.

## Scrollback artifact

- Artifact SHA-256: `6280786d713abe37eb979e309d27b7ed1eb1f1e1e76e485b0bc5f9c357391ca6`
- Size: 2,246,656 bytes
- Mouse capture is enabled so wheel events reach the host; wheel and Shift+navigation scroll the retained terminal viewport.
- Viewport changes mark the frame dirty before composition.
- The non-interactive probe verifies retained scrollback, viewport movement, and repainted earlier content.
- Use the outer terminal's modifier-based selection, usually Shift+drag in Windows Terminal, while pointer capture is active.

## Selection and exit artifact

- Artifact SHA-256: `8189720841dcc7dc05ff7f9cdacdc446e3a506a03fb5f6667968000126e9e277`
- Size: 2,264,064 bytes
- Plain left-drag selects terminal content; release emits an OSC 52 clipboard write.
- Home/End jump to scrollback boundaries; PageUp/PageDown and mouse wheel scroll the retained viewport.
- PTY output-channel closure exits the host even if process wait state is stale.
- A second Ctrl+C within 1.5 seconds requests host cleanup instead of leaving a frozen UI.
- Non-interactive probes pass for terminal rendering, scrollback, selection, and PTY cleanup.

Manual retest should verify plain drag selection, mouse wheel, Home/End, and repeated Ctrl+C recovery. No terminal was launched or driven by automation on the active workstation.
