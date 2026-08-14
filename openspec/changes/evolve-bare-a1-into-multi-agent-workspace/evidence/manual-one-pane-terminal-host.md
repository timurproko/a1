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

Manual retest should use `npm run proof:terminal-host -- --run -- pi` from the intended shell. No terminal was launched or driven by automation on the active workstation.
