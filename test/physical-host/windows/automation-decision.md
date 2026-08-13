# Windows physical-host automation decision

## Selected driver

AddOne pins physical Windows automation contract `addone-windows-native-ui-v1` to APIs maintained as part of Windows:

- UI Automation (`UIAutomationClient`) for locating the uniquely titled Windows Terminal window, inspecting identity, and requesting focus;
- User32 `SetForegroundWindow`, `ShowWindow`, and `MoveWindow` for explicit foreground/window placement;
- User32 `SendInput` with `KEYEVENTF_UNICODE` for OS-level physical text injection and virtual-key injection for non-text actions;
- User32 window bounds plus `System.Drawing.Graphics.CopyFromScreen` for independent physical screenshots;
- Windows Terminal Store package identity/version and a temporary fragment profile for fixed font, size, colors, cursor, padding, and close behavior.

The checked-in driver contract is versioned independently of product code and uses no AddOne terminal parser, encoder, framebuffer, or runtime import. Physical action metadata records requested OS actions, not predicted child bytes. The generic child recorder remains the authority for received child effects.

## Mandatory isolated worker

The driver is forbidden on a developer's active desktop. It runs only on a provisioner-created, dedicated disposable Windows worker or VM whose interactive desktop contains no user-owned applications. Before creating a Windows Terminal fragment, loading UI automation, or spawning `wt.exe`, `physical-worker-isolation.ps1` requires a short-lived attestation outside the repository and binds it to:

- the physical-host-test worker role and Windows platform;
- dedicated/disposable worker and exclusive-desktop declarations;
- no-user-applications policy;
- machine, interactive session, and test-user SID;
- a unique allocation ID supplied independently in the job environment;
- a validity interval of no more than 24 hours;
- an empty pre-existing visible-window inventory.

Missing, stale, repository-authored, or mismatched evidence produces an `outcome: blocked` verdict before terminal launch. The workstation may submit a job to an already isolated worker and download artifacts, but no local fallback exists. `physical-worker-attestation.example.json` documents the provisioner-owned format; copying it does not pass the runtime identity checks.

## Options evaluated

| Option | Result |
|---|---|
| Native Windows UI Automation + User32 | Selected: OS-maintained, already present on supported Windows, no downloaded runtime/native addon, direct foreground and physical-input APIs, smallest audited boundary. |
| Appium Windows Driver | Rejected for the initial oracle: maintained and capable, but requires a separate server plus WebDriver client and creates a larger versioned service boundary for one application window. Re-evaluate if native accessibility discovery proves unreliable across certified hosts. |
| FlaUI | Rejected for the initial oracle: maintained .NET wrapper, but adds NuGet/runtime packaging over the same UI Automation APIs without reducing the required User32 input/capture boundary. |
| `@nut-tree-fork/nut-js` | Rejected: maintained fork but adds a native addon and image stack; physical-host evidence must not depend on an avoidable prebuilt native package. |
| WinAppDriver | Rejected: legacy standalone service with weaker maintenance fit than Appium Windows Driver. |
| PowerShell `SendKeys` | Rejected: focus and modifier behavior are less explicit than `SendInput`, and it cannot represent the full required action inventory reliably. |

## Pinning and evidence

Every smoke/certification run records:

- driver contract `addone-windows-native-ui-v1`;
- Windows release/build and interactive session ID;
- exact Windows Terminal package version;
- fixed fragment profile name/GUID and visual settings;
- window handle, process ID, UI Automation name, bounds, focus result, action timestamps, screenshots, child effect, and cleanup result.

A run is invalid if it cannot prove an isolated allocation, a unique visible target window, foreground focus, an injected child effect, non-empty screenshots, and cleanup of that exact window. Cleanup first verifies the recorded PID and process start time; PID reuse or otherwise changed ownership is never terminated. Broad executable-name, wildcard, or pre-existing-process cleanup is prohibited. If exact cleanup fails, the worker is discarded by its external provisioner rather than searching for or terminating terminal applications.
