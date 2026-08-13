# Windows physical-host automation decision

## Selected driver

AddOne pins physical Windows automation contract `addone-windows-native-ui-v1` to APIs maintained as part of Windows:

- UI Automation (`UIAutomationClient`) for locating the uniquely titled Windows Terminal window, inspecting identity, and requesting focus;
- User32 `SetForegroundWindow`, `ShowWindow`, and `MoveWindow` for explicit foreground/window placement;
- User32 `SendInput` with `KEYEVENTF_UNICODE` for OS-level physical text injection and virtual-key injection for non-text actions;
- User32 window bounds plus `System.Drawing.Graphics.CopyFromScreen` for independent physical screenshots;
- Windows Terminal Store package identity/version and a temporary fragment profile for fixed font, size, colors, cursor, padding, and close behavior.

The checked-in driver contract is versioned independently of product code and uses no AddOne terminal parser, encoder, framebuffer, or runtime import. Physical action metadata records requested OS actions, not predicted child bytes. The generic child recorder remains the authority for received child effects.

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

A run is invalid if it cannot prove a unique visible target window, foreground focus, an injected child effect, non-empty screenshots, and cleanup of that exact window.
