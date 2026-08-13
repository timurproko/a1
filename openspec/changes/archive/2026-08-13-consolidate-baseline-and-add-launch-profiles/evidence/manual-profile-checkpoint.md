# Manual Launch-Profile Checkpoint

Candidate: `@timurproko/addone@0.1.5-dev.9`

- Source commit: `3bfafa3e9d83dd038d047f984543c8eb18aaa99a`
- Tarball: `artifacts/manual-profile-candidate/timurproko-addone-0.1.5-dev.9.tgz`
- Integrity: `sha512-o8Kfdl7aM1Lfsx7EJeZTlPmftTAuYd8r1ZUC5vw74eHI7SdgRWHQTOGTcECrBNDu65VOpnSo/WNRzma2SnlOlw==`
- SHA-1: `6edc8866ffe31a0d91bdb21256f17ca6dd5ce5c5`
- SHA-256: `9f32433a3e3ac86dd388291fc6cef751dabe985b47fd46e0a0f243f779fa5b1f`
- Non-desktop gates: passed
- Physical/cross-platform certification: deferred
- Manual acceptance: pending

No test or coding agent may run these commands, launch/focus/resize a terminal, inject input, close Pi, or clean up workstation processes. The user performs and controls every interactive step.

## Install Exact Bytes

From the candidate checkout in PowerShell:

```powershell
$manualRoot = (Resolve-Path "artifacts/manual-profile-candidate").Path
npm install --prefix "$manualRoot\install" --ignore-scripts "$manualRoot\timurproko-addone-0.1.5-dev.9.tgz"

$env:ADDONE_CONFIG_DIR = "$manualRoot\state\config"
$env:ADDONE_DATA_DIR = "$manualRoot\state\data"
$env:ADDONE_RUNTIME_DIR = "$manualRoot\state\runtime"
$env:ADDONE_DATABASE_PATH = "$manualRoot\state\data\control.sqlite3"

# Keep AddOne-owned Pi profiles disposable during this checkpoint.
$env:ADDONE_PROFILE_HOME = "$manualRoot\profile-home"
$a1 = "$manualRoot\install\node_modules\.bin\a1.cmd"
```

Do not set `PI_CODING_AGENT_DIR`; the candidate owns that selection. `a1 pi` deliberately uses your ordinary `~/.pi/agent` profile even while `ADDONE_PROFILE_HOME` makes the two `.a1` profiles disposable.

## User-Controlled Launches

Run and exit each process yourself before entering the next command:

```powershell
& $a1
& $a1 pi
& $a1 sandbox
```

Equivalent `addone`, `addone pi`, and `addone sandbox` spellings may also be checked from the same install prefix.

## Acceptance Checklist

### Command/profile mapping

- [ ] Bare `a1` is the AddOne agent experience and uses `$manualRoot\profile-home\.a1\agent`.
- [ ] `a1 pi` behaves like directly launched `pi` and uses ordinary `~/.pi/agent` rather than either `.a1` profile.
- [ ] `a1 sandbox` uses `$manualRoot\profile-home\.a1\sandbox`.
- [ ] `a1 agent` exits with guidance that bare `a1` is the agent experience and does not launch Pi.
- [ ] Unknown/AddOne-extra subcommands exit with concise usage and do not launch Pi.

### Isolation

- [ ] First bare launch creates only `.a1\agent` plus empty resource directories and preserves existing files.
- [ ] First sandbox launch creates only `.a1\sandbox` plus empty resource directories and preserves existing files.
- [ ] Settings, `/login` authentication, sessions, extensions, skills, prompts, themes, packages, and trust choices made in one profile are absent from the other profiles.
- [ ] Missing authentication follows Pi's normal `/login` behavior; AddOne does not copy credentials from vanilla Pi.
- [ ] Sandbox ignores project-local executable `.pi` resources for the run (`--no-approve`) while loading sandbox-owned resources.
- [ ] Provider credentials intentionally supplied as environment variables remain available in every mode.
- [ ] Sandbox is understood as Pi profile/resource isolation, not filesystem/process/network/security isolation.

### Transparent terminal behavior

Compare each mode with direct Pi in the same terminal and directory:

- [ ] Pi is the first visible application output; no AddOne frame, clear, logo, or spacing appears.
- [ ] Rendering, Unicode, styles, cursor, rapid typing, control keys, arrows, paste, dialogs, selection, clipboard, mouse, wheel, scrollback, and resize remain unchanged.
- [ ] Normal/error exit preserves Pi output and returns a usable parent prompt.
- [ ] After exit, typing, cursor movement, Backspace, Delete, and command submission work normally.
- [ ] Profile selection adds no visible relay, nested terminal, input delay, renderer, or internal tab surface.

Report any failed item with the exact command, direct-versus-candidate behavior, terminal/OS version, reproducibility, and optional manually captured screenshot/video.
