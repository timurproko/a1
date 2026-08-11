import { spawnSync } from "node:child_process";

export type PowerShellRunner = (script: string) => { readonly ok: boolean; readonly stdout: string };

export const CONSOLE_MODE_DECLARATION = `
using System;
using System.Runtime.InteropServices;
public static class AddOneConsoleMode {
  [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr GetStdHandle(int id);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool GetConsoleMode(IntPtr handle, out uint mode);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool SetConsoleMode(IntPtr handle, uint mode);
}`;

export function getWindowsConsoleInputMode(runner: PowerShellRunner = runPowerShell): number | null {
  const result = runner(`Add-Type -TypeDefinition @'\n${CONSOLE_MODE_DECLARATION}\n'@; $h=[AddOneConsoleMode]::GetStdHandle(-10); [uint32]$m=0; if(-not [AddOneConsoleMode]::GetConsoleMode($h,[ref]$m)){exit 1}; [Console]::Out.Write($m)`);
  if (!result.ok || !/^\d+$/.test(result.stdout.trim())) return null;
  const mode = Number(result.stdout.trim());
  return Number.isSafeInteger(mode) && mode >= 0 && mode <= 0xffff_ffff ? mode : null;
}

export function setWindowsConsoleInputMode(mode: number, runner: PowerShellRunner = runPowerShell): boolean {
  if (!Number.isSafeInteger(mode) || mode < 0 || mode > 0xffff_ffff) return false;
  return runner(`Add-Type -TypeDefinition @'\n${CONSOLE_MODE_DECLARATION}\n'@; $h=[AddOneConsoleMode]::GetStdHandle(-10); if(-not [AddOneConsoleMode]::SetConsoleMode($h,[uint32]${mode})){exit 1}`).ok;
}

export function runPowerShell(script: string): { readonly ok: boolean; readonly stdout: string } {
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "ignore"],
    windowsHide: true,
  });
  return { ok: !result.error && result.status === 0, stdout: result.stdout ?? "" };
}
