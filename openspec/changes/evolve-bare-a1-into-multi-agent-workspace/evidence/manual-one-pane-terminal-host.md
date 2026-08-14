# Manual one-pane terminal-host result

## First manual artifact

- Artifact: `native/terminal-host/target/debug/addone-terminal-host.exe`
- SHA-256: `8d81db199687a9b8f195b4e40cb4b235de3ea00ffeb9cf55f9c64b1b3582cbba`
- Size: 2,214,912 bytes
- User-controlled run: one fullscreen `cmd.exe` pane inside Windows Terminal

The user reported that typing commands, cursor movement, colors, Windows Terminal resize, and fast output worked correctly.

The first artifact had one finding: `Ctrl+Shift+Q` did not exit.

## Corrective artifact

- Corrective artifact SHA-256: `00bd523a3d1f188a9bb6944790e8a37a73272a25229d46094ee118100e029b1f`
- Size: 2,214,912 bytes
- Correction: accept `Ctrl+Q` or `Ctrl+Shift+Q`, including uppercase key delivery.
- Automated non-interactive result after correction: build, version/provenance, terminal model, PTY start, process exit, and cleanup passed.

Manual retest of the exit shortcut and vanilla Pi launch remains pending. No terminal was launched or driven by automation on the active workstation.
