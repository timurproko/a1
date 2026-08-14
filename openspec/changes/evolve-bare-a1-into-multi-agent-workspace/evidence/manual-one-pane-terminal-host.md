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

Manual retest of the exit shortcut and vanilla Pi launch remains pending. No terminal was launched or driven by automation on the active workstation.
