// Repository-local launch that keeps the colours a user sees.
//
// Node decides once, at startup, whether it may send VT sequences to the
// terminal; when it decides it may not, it renders ANSI itself and knows only
// sixteen colours, so every 24-bit colour becomes the terminal's nearest palette
// entry. Under an MSYS shell (Git Bash) a directly launched `node` gets that
// decision wrong, while a shell that execs into Node does not — the shape the
// installed command's npm shim already has. Every other shell launches Node
// directly, because there the inherited handle is already the right one.
//
// npm runs scripts through cmd.exe on Windows, where `sh` is usually not on
// PATH, so the shell is located from the environment Git Bash exports rather
// than assumed to be resolvable.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const scriptsDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const entry = resolve(scriptsDirectory, "start-local.mjs");
const passedArguments = process.argv.slice(2);
const shell = msysShell();

// An interactive screen needs a terminal on its input. Run through a package
// manager on Windows and the script is handed to cmd.exe, which can leave the
// launch without one, and the session would end the moment it read end of file.
if (!process.stdin.isTTY) {
  const profile = passedArguments[0] === undefined ? "" : ` ${passedArguments[0]}`;
  console.error(`This launch has no terminal on its input, so the session would close as it started. Run "./scripts/dev${profile}" from the shell instead.`);
  process.exit(1);
}

const child = shell
  ? spawn(shell, ["-c", 'exec "$0" "$@"', process.execPath, entry, ...passedArguments], { stdio: "inherit" })
  : spawn(process.execPath, [entry, ...passedArguments], { stdio: "inherit" });

child.once("error", error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
child.once("close", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

/** The MSYS shell this run came from, or none when the direct handle is already right. */
function msysShell() {
  if (process.platform !== "win32" || !process.env.MSYSTEM) return "";
  const candidates = [
    process.env.A1_DEV_SHELL,
    process.env.EXEPATH ? resolve(process.env.EXEPATH, "usr/bin/sh.exe") : undefined,
    process.env.MINGW_PREFIX ? resolve(process.env.MINGW_PREFIX, "../usr/bin/sh.exe") : undefined,
    "C:/Program Files/Git/usr/bin/sh.exe",
    "C:/Program Files (x86)/Git/usr/bin/sh.exe",
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return "";
}
