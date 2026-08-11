import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import type { WindowsInputRecord } from "./windows.js";

export interface WindowsRecordReader {
  readonly available: boolean;
  stop(): void;
}

/**
 * Reads native console INPUT_RECORD values in an isolated helper so a blocking
 * ReadConsoleInputW call never blocks AddOne's UI event loop. If the inherited
 * stdin is not a console handle, callers fall back to VTI decoding.
 */
export function startWindowsRecordReader(
  onRecord: (record: WindowsInputRecord) => void,
  onUnavailable: (reason: string) => void,
): WindowsRecordReader {
  let child: ChildProcessByStdio<null, Readable, Readable>;
  try {
    child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", WINDOWS_RECORD_READER_SCRIPT], {
      stdio: ["inherit", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    onUnavailable(error instanceof Error ? error.message : String(error));
    return { available: false, stop() {} };
  }
  const lines = createInterface({ input: child.stdout });
  lines.on("line", line => {
    try {
      const value = JSON.parse(line) as WindowsInputRecord;
      if (["key", "mouse", "focus", "resize"].includes(value.type)) onRecord(value);
    } catch {
      onUnavailable(`invalid ReadConsoleInputW helper frame: ${line}`);
    }
  });
  let error = "";
  child.stderr.on("data", chunk => { error += String(chunk); });
  child.once("error", failure => onUnavailable(failure.message));
  child.once("exit", code => {
    if (code !== 0) onUnavailable(error.trim() || `ReadConsoleInputW helper exited ${String(code)}`);
  });
  return {
    available: true,
    stop(): void {
      lines.close();
      if (!child.killed) child.kill();
    },
  };
}

const WINDOWS_RECORD_READER_SCRIPT = String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class AddOneInputRecords {
  [StructLayout(LayoutKind.Sequential)] public struct Coord { public short X; public short Y; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct KeyEvent {
    [MarshalAs(UnmanagedType.Bool)] public bool Down; public ushort Repeat; public ushort VirtualKey; public ushort Scan; public char Unicode; public uint Control;
  }
  [StructLayout(LayoutKind.Sequential)] public struct MouseEvent { public Coord Position; public uint Buttons; public uint Control; public uint Flags; }
  [StructLayout(LayoutKind.Sequential)] public struct ResizeEvent { public Coord Size; }
  [StructLayout(LayoutKind.Sequential)] public struct FocusEvent { [MarshalAs(UnmanagedType.Bool)] public bool Focused; }
  [StructLayout(LayoutKind.Explicit)] public struct EventUnion {
    [FieldOffset(0)] public KeyEvent Key; [FieldOffset(0)] public MouseEvent Mouse; [FieldOffset(0)] public ResizeEvent Resize; [FieldOffset(0)] public FocusEvent Focus;
  }
  [StructLayout(LayoutKind.Explicit)] public struct InputRecord { [FieldOffset(0)] public ushort Type; [FieldOffset(4)] public EventUnion Event; }
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr GetStdHandle(int id);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool ReadConsoleInputW(IntPtr input, [Out] InputRecord[] records, uint length, out uint read);
  public static object Read() {
    var records = new InputRecord[1]; uint count;
    if (!ReadConsoleInputW(GetStdHandle(-10), records, 1, out count) || count == 0) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    var r = records[0];
    if (r.Type == 0x0001) return new { type="key", keyDown=r.Event.Key.Down, repeatCount=(int)r.Event.Key.Repeat, virtualKey=(int)r.Event.Key.VirtualKey, scanCode=(int)r.Event.Key.Scan, unicode=(int)r.Event.Key.Unicode, controlKeyState=(long)r.Event.Key.Control };
    if (r.Type == 0x0002) return new { type="mouse", x=(int)r.Event.Mouse.Position.X, y=(int)r.Event.Mouse.Position.Y, buttonState=(long)r.Event.Mouse.Buttons, controlKeyState=(long)r.Event.Mouse.Control, eventFlags=(long)r.Event.Mouse.Flags };
    if (r.Type == 0x0004) return new { type="resize", columns=(int)r.Event.Resize.Size.X, rows=(int)r.Event.Resize.Size.Y };
    if (r.Type == 0x0010) return new { type="focus", focused=r.Event.Focus.Focused };
    return new { type="ignored" };
  }
}
'@
try {
  while ($true) {
    $record = [AddOneInputRecords]::Read()
    if ($record.type -ne 'ignored') { [Console]::Out.WriteLine(($record | ConvertTo-Json -Compress)) }
  }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 2
}
`;
