# User-Controlled Provider Authentication Parity

Run this only from the exact repaired checkout or candidate. These commands use a disposable Windows home and do not read, copy, modify, or compare the real `%USERPROFILE%\.a1\agent\auth.json` or `%USERPROFILE%\.pi\agent\auth.json` files.

## Prepare the disposable profiles

```powershell
cd D:\Git\a1
git fetch origin --prune
git worktree add --detach .worktrees\accept-owned-pi-parity origin/develop
cd .worktrees\accept-owned-pi-parity
npm ci
npm run build

$ParityHome = Join-Path $env:TEMP ("a1-provider-parity-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force `
  (Join-Path $ParityHome ".a1\agent"), `
  (Join-Path $ParityHome ".pi\agent") | Out-Null

$SavedUserProfile = $env:USERPROFILE
$SavedHome = $env:HOME
$SavedA1ProfileHome = $env:A1_PROFILE_HOME
$env:USERPROFILE = $ParityHome
$env:HOME = $ParityHome
$env:A1_PROFILE_HOME = $ParityHome
```

Keep this PowerShell window open through all comparisons so both programs resolve the same disposable home.

## Empty-profile comparison

Run bare A1:

```powershell
npm start
```

Inside A1:

1. Run `/login`, choose an authentication type, and verify providers say `unconfigured`.
2. Cancel, run `/model`, and verify no provider models are selectable.
3. Exit.

Run untouched Pi against its separate but equivalently empty profile:

```powershell
npm start -- pi
```

Repeat `/login` and `/model`. The provider labels, no-model behavior, and footer state must agree with bare A1.

## Stored-provider comparison

In `npm start -- pi`, use `/login` to authenticate a test provider, then exit and launch `npm start -- pi` again. Verify:

- the provider is visibly configured/stored;
- only configured-provider models are available;
- the selected model and footer agree with `/model`.

Then run bare A1 and independently authenticate the same provider using `/login`. Do not copy either `auth.json`; each profile owns its own credential. Exit and restart `npm start`, then verify the same visible configured status, models, and footer state.

A persisted credential means that profile remains logged in across a new process. Starting a new terminal session is not logout. Use `/logout` to remove a credential saved by `/login`.

## Logout comparison

For each program separately:

1. Run `/logout` and select the stored provider.
2. Open `/login`; the provider must now show `unconfigured` unless an environment or provider configuration still authenticates it.
3. Open `/model`; models requiring the removed credential must be absent.
4. Verify no stale removed-provider model remains in the footer.
5. Restart the same program and repeat `/login` and `/model` to confirm the state persists.

`/logout` removes stored credentials only. It must not claim to remove environment variables, runtime credentials, or `models.json` configuration.

## Cleanup

After exiting both programs:

```powershell
$env:USERPROFILE = $SavedUserProfile
$env:HOME = $SavedHome
$env:A1_PROFILE_HOME = $SavedA1ProfileHome
Remove-Item -LiteralPath $ParityHome -Recurse -Force
cd D:\Git\a1
git worktree remove .worktrees\accept-owned-pi-parity
git worktree prune
```

Acceptance requires the user to confirm that configured-provider labels and visible models are mutually consistent in both empty and stored states.
