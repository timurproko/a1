param(
  [Parameter(Mandatory = $true)][string]$ArtifactRoot,
  [Parameter(Mandatory = $true)][string]$RepositoryRoot,
  [string]$ProfileName = "AddOne Physical Smoke",
  [int]$TimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$DriverVersion = "addone-windows-native-ui-v1"
$WindowTitle = "AddOne Physical Smoke $([Guid]::NewGuid().ToString('N'))"
$ArtifactRoot = [IO.Path]::GetFullPath($ArtifactRoot)
$RepositoryRoot = [IO.Path]::GetFullPath($RepositoryRoot)
$LogPath = Join-Path $ArtifactRoot "child-observations.jsonl"
$ActionPath = Join-Path $ArtifactRoot "actions.jsonl"
$ScreenshotBefore = Join-Path $ArtifactRoot "focused-before-input.png"
$ScreenshotAfter = Join-Path $ArtifactRoot "focused-after-input.png"
$VerdictPath = Join-Path $ArtifactRoot "smoke-verdict.json"
$FragmentRoot = Join-Path $env:LOCALAPPDATA "Microsoft\Windows Terminal\Fragments\AddOnePhysicalSmoke"
$FragmentPath = Join-Path $FragmentRoot "AddOnePhysicalSmoke.json"
$ProfileGuid = "{6bde4698-e9a2-5b0f-9970-14064f7d50f5}"
$Process = $null
$Window = $null
$Handle = [IntPtr]::Zero
$WindowProcessId = $null
$UiAutomationName = $null
$Bounds = $null
$terminalPackage = $null
$Passed = $false
$Failure = $null
$Cleanup = [ordered]@{ attempted = $false; windowClosed = $false; childExited = $null; forced = $false; processId = $null }
$Actions = New-Object System.Collections.Generic.List[object]

New-Item -ItemType Directory -Force -Path $ArtifactRoot, $FragmentRoot | Out-Null
foreach ($path in @($LogPath, $ActionPath, $ScreenshotBefore, $ScreenshotAfter, $VerdictPath)) {
  Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
}

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class AddOneNativeUi {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public InputUnion U; }
  [StructLayout(LayoutKind.Explicit)] public struct InputUnion {
    [FieldOffset(0)] public MOUSEINPUT mi;
    [FieldOffset(0)] public KEYBDINPUT ki;
    [FieldOffset(0)] public HARDWAREINPUT hi;
  }
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct HARDWAREINPUT { public uint uMsg; public ushort wParamL; public ushort wParamH; }
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int width, int height, bool repaint);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
  [DllImport("user32.dll", SetLastError = true)] public static extern bool PostMessage(IntPtr hWnd, uint message, UIntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll", SetLastError = true)] public static extern uint SendInput(uint count, INPUT[] inputs, int size);
  public const uint INPUT_MOUSE = 0;
  public const uint INPUT_KEYBOARD = 1;
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  public const uint KEYEVENTF_KEYUP = 0x0002;
  public const uint KEYEVENTF_UNICODE = 0x0004;
  public const uint WM_CLOSE = 0x0010;
  public static uint ClickAt(int x, int y) {
    if (!SetCursorPos(x, y)) return 0;
    var inputs = new INPUT[] {
      MouseInput(MOUSEEVENTF_LEFTDOWN), MouseInput(MOUSEEVENTF_LEFTUP)
    };
    return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
  }
  public static uint SendUnicodeText(string text) {
    var inputs = new INPUT[text.Length * 2];
    for (var index = 0; index < text.Length; index++) {
      inputs[index * 2] = KeyboardInput(0, text[index], KEYEVENTF_UNICODE);
      inputs[index * 2 + 1] = KeyboardInput(0, text[index], KEYEVENTF_UNICODE | KEYEVENTF_KEYUP);
    }
    return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
  }
  public static uint SendVirtualKeyPress(ushort virtualKey) {
    var inputs = new INPUT[] {
      KeyboardInput(virtualKey, (char)0, 0), KeyboardInput(virtualKey, (char)0, KEYEVENTF_KEYUP)
    };
    return SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
  }
  private static INPUT MouseInput(uint flags) {
    return new INPUT { type = INPUT_MOUSE, U = new InputUnion { mi = new MOUSEINPUT { dwFlags = flags } } };
  }
  private static INPUT KeyboardInput(ushort virtualKey, char scan, uint flags) {
    return new INPUT { type = INPUT_KEYBOARD, U = new InputUnion { ki = new KEYBDINPUT { wVk = virtualKey, wScan = scan, dwFlags = flags } } };
  }
}
"@

function Write-Ndjson([string]$Path, [object]$Value) {
  Add-Content -LiteralPath $Path -Encoding UTF8 -Value ($Value | ConvertTo-Json -Compress -Depth 12)
}
function Timestamp-Ns { return [Diagnostics.Stopwatch]::GetTimestamp().ToString() }
function Record-Action([string]$Id, [string]$Kind, [object]$Parameters) {
  $record = [ordered]@{ id = $Id; kind = $Kind; dispatchedAtTicks = (Timestamp-Ns); parameters = $Parameters }
  $Actions.Add($record)
  Write-Ndjson $ActionPath $record
}
function Find-Window([string]$Title, [int]$Timeout) {
  $condition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::NameProperty, $Title)
  $deadline = [DateTime]::UtcNow.AddSeconds($Timeout)
  do {
    $matches = [Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children, $condition)
    if ($matches.Count -eq 1) { return $matches[0] }
    if ($matches.Count -gt 1) { throw "multiple Windows Terminal windows matched unique title '$Title'" }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "timed out locating Windows Terminal window '$Title'"
}
function Click-Point([int]$X, [int]$Y) {
  $sent = [AddOneNativeUi]::ClickAt($X, $Y)
  if ($sent -ne 2) { throw "SendInput injected $sent of 2 focus-click events (Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))" }
}
function Send-UnicodeText([string]$Text) {
  $expected = $Text.Length * 2
  $sent = [AddOneNativeUi]::SendUnicodeText($Text)
  if ($sent -ne $expected) { throw "SendInput injected $sent of $expected Unicode events (Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))" }
}
function Send-VirtualKey([uint16]$VirtualKey) {
  $sent = [AddOneNativeUi]::SendVirtualKeyPress($VirtualKey)
  if ($sent -ne 2) { throw "SendInput injected $sent of 2 virtual-key events (Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))" }
}
function Capture-Window([IntPtr]$Handle, [string]$Path) {
  $rect = New-Object AddOneNativeUi+RECT
  if (-not [AddOneNativeUi]::GetWindowRect($Handle, [ref]$rect)) { throw "GetWindowRect failed" }
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  if ($width -lt 100 -or $height -lt 100) { throw "window bounds are too small: ${width}x${height}" }
  $bitmap = New-Object Drawing.Bitmap($width, $height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size, [Drawing.CopyPixelOperation]::SourceCopy)
    $bitmap.Save($Path, [Drawing.Imaging.ImageFormat]::Png)
  } finally { $graphics.Dispose(); $bitmap.Dispose() }
  return [ordered]@{ left = $rect.Left; top = $rect.Top; width = $width; height = $height }
}

try {
  $terminalPackage = Get-AppxPackage Microsoft.WindowsTerminal
  if (-not $terminalPackage) { throw "Microsoft.WindowsTerminal is not installed" }
  $node = (Get-Command node.exe).Source
  $recorder = Join-Path $RepositoryRoot "test\physical-host\generic-child-recorder.mjs"
  if (-not (Test-Path -LiteralPath $recorder)) { throw "generic child recorder not found at $recorder" }
  $profile = [ordered]@{
    profiles = @([ordered]@{
      name = $ProfileName; guid = $ProfileGuid; hidden = $false; commandline = "`"$node`" `"$recorder`" --log `"$LogPath`"";
      startingDirectory = $RepositoryRoot; font = [ordered]@{ face = "Cascadia Mono"; size = 12; weight = "normal" };
      colorScheme = "Campbell"; cursorShape = "bar"; padding = "8"; closeOnExit = "never"; suppressApplicationTitle = $true;
    })
  }
  $profile | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $FragmentPath -Encoding UTF8

  Record-Action "launch" "launch" ([ordered]@{ profile = $ProfileName; title = $WindowTitle })
  $terminalArguments = "-w new nt -p `"$ProfileName`" --title `"$WindowTitle`""
  $Process = Start-Process -FilePath "wt.exe" -ArgumentList $terminalArguments -PassThru
  $Window = Find-Window $WindowTitle $TimeoutSeconds
  $Handle = [IntPtr]$Window.Current.NativeWindowHandle
  if ($Handle -eq [IntPtr]::Zero) { throw "UI Automation returned no native window handle" }
  $UiAutomationName = $Window.Current.Name
  $WindowProcessId = [uint32]$Window.Current.ProcessId
  if ($UiAutomationName -ne $WindowTitle) { throw "UI Automation window identity changed from '$WindowTitle' to '$UiAutomationName'" }
  [void][AddOneNativeUi]::ShowWindow($Handle, 9)
  [void][AddOneNativeUi]::MoveWindow($Handle, 80, 80, 1200, 760, $true)
  $Window.SetFocus()
  if (-not [AddOneNativeUi]::SetForegroundWindow($Handle)) { throw "SetForegroundWindow failed" }
  Start-Sleep -Milliseconds 500
  if ([AddOneNativeUi]::GetForegroundWindow() -ne $Handle) { throw "Windows Terminal did not become the foreground window" }
  $Bounds = Capture-Window $Handle $ScreenshotBefore
  Click-Point ($Bounds.left + [Math]::Floor($Bounds.width / 2)) ($Bounds.top + [Math]::Floor($Bounds.height / 2))
  Start-Sleep -Milliseconds 100
  if ([AddOneNativeUi]::GetForegroundWindow() -ne $Handle) { throw "Windows Terminal lost foreground focus after pane click" }
  Record-Action "focus" "focus" ([ordered]@{ handle = $Handle.ToInt64(); processId = $WindowProcessId; method = "UIAutomation.SetFocus+SetForegroundWindow+physical-click" })

  $Text = "ADDONE_NATIVE_UI_SMOKE_$([Guid]::NewGuid().ToString('N'))"
  Record-Action "inject-text" "text" ([ordered]@{ text = $Text; method = "SendInput.KEYEVENTF_UNICODE" })
  Send-UnicodeText $Text
  Send-VirtualKey 0x0D
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  do {
    Start-Sleep -Milliseconds 100
    if (Test-Path -LiteralPath $LogPath) { $logSource = Get-Content -LiteralPath $LogPath -Raw -ErrorAction SilentlyContinue } else { $logSource = "" }
  } while ($logSource -notmatch [Regex]::Escape($Text) -and [DateTime]::UtcNow -lt $deadline)
  if ($logSource -notmatch [Regex]::Escape($Text)) { throw "child recorder did not observe injected text" }
  Start-Sleep -Milliseconds 300
  [void](Capture-Window $Handle $ScreenshotAfter)
  foreach ($path in @($ScreenshotBefore, $ScreenshotAfter)) {
    if ((Get-Item -LiteralPath $path).Length -lt 1024) { throw "screenshot is empty: $path" }
  }
  $Passed = $true
} catch {
  $Failure = $_.Exception.Message
} finally {
  if ($Handle -ne [IntPtr]::Zero) {
    try {
      $Cleanup.attempted = $true
      $Cleanup.processId = $WindowProcessId
      if ([AddOneNativeUi]::IsWindow($Handle)) {
        if (-not [AddOneNativeUi]::PostMessage($Handle, [AddOneNativeUi]::WM_CLOSE, [UIntPtr]::Zero, [IntPtr]::Zero)) {
          throw "PostMessage(WM_CLOSE) failed with Win32 error $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
        }
        $cleanupDeadline = [DateTime]::UtcNow.AddSeconds(5)
        while ([AddOneNativeUi]::IsWindow($Handle) -and [DateTime]::UtcNow -lt $cleanupDeadline) { Start-Sleep -Milliseconds 100 }
      }
      if ([AddOneNativeUi]::IsWindow($Handle)) {
        $Cleanup.forced = $true
        Stop-Process -Id $WindowProcessId -Force -ErrorAction Stop
        Start-Sleep -Milliseconds 300
      }
      $Cleanup.windowClosed = -not [AddOneNativeUi]::IsWindow($Handle)
      if (Test-Path -LiteralPath $LogPath) {
        $started = Get-Content -LiteralPath $LogPath | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object kind -eq "recorder-started" | Select-Object -First 1
        if ($started) {
          $childDeadline = [DateTime]::UtcNow.AddSeconds(5)
          while ((Get-Process -Id $started.pid -ErrorAction SilentlyContinue) -and [DateTime]::UtcNow -lt $childDeadline) { Start-Sleep -Milliseconds 100 }
          $Cleanup.childExited = -not [bool](Get-Process -Id $started.pid -ErrorAction SilentlyContinue)
        }
      }
      if (-not $Cleanup.windowClosed -or $Cleanup.childExited -eq $false) { throw "exact Windows Terminal window or child remained after cleanup" }
    } catch {
      if (-not $Failure) { $Failure = "cleanup failed: $($_.Exception.Message)" }
      $Passed = $false
    }
  } elseif ($Process) {
    $Cleanup.attempted = $true
    $Cleanup.forced = $true
    $Cleanup.processId = $Process.Id
    Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
  }
  Record-Action "cleanup" "exit" ([ordered]@{ handle = $Handle.ToInt64(); processId = $Cleanup.processId; windowClosed = $Cleanup.windowClosed; childExited = $Cleanup.childExited; forced = $Cleanup.forced })
  Remove-Item -LiteralPath $FragmentPath -Force -ErrorAction SilentlyContinue
  if ((Test-Path $FragmentRoot) -and -not (Get-ChildItem $FragmentRoot -Force)) { Remove-Item $FragmentRoot -Force -ErrorAction SilentlyContinue }

  $verdict = [ordered]@{
    schema = "addone-windows-native-ui-smoke-v1"; passed = $Passed; driver = $DriverVersion;
    windows = [Environment]::OSVersion.Version.ToString(); sessionId = (Get-Process -Id $PID).SessionId;
    windowsTerminalVersion = if ($terminalPackage) { $terminalPackage.Version.ToString() } else { $null };
    profile = $ProfileName; profileGuid = $ProfileGuid; title = $WindowTitle;
    uiAutomationName = $UiAutomationName; nativeWindowHandle = $Handle.ToInt64(); windowProcessId = $WindowProcessId;
    bounds = if ($Bounds) { $Bounds } else { $null }; actions = $Actions; cleanup = $Cleanup;
    screenshots = @([IO.Path]::GetFileName($ScreenshotBefore), [IO.Path]::GetFileName($ScreenshotAfter));
    childLog = [IO.Path]::GetFileName($LogPath); failure = $Failure; completedAt = [DateTime]::UtcNow.ToString("o")
  }
  $verdict | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $VerdictPath -Encoding UTF8
}

if (-not $Passed) { Write-Error $Failure; exit 1 }
Write-Output $VerdictPath
