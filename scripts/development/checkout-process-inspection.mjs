import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, realpath } from "node:fs/promises";
import { basename, isAbsolute, resolve, sep } from "node:path";

const execute = promisify(execFile);
const failure = code => Object.assign(new Error(code), { cleanupCode: code });
const normalized = path => process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);

/** Decode the quoted argv spelling used by Node launchers; never search arbitrary argument substrings. */
export function commandArguments(line) {
  const args = []; let value = "", quoted = false, started = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (character === "\\") {
      let count = 1;
      while (line[index + 1] === "\\") { count++; index++; }
      if (line[index + 1] === '"') {
        value += "\\".repeat(Math.floor(count / 2));
        if (count % 2) { value += '"'; index++; } else { quoted = !quoted; index++; }
      } else value += "\\".repeat(count);
      started = true;
    } else if (character === '"') { quoted = !quoted; started = true; }
    else if (/\s/u.test(character) && !quoted) { if (started) { args.push(value); value = ""; started = false; } }
    else { value += character; started = true; }
  }
  if (quoted) return [];
  if (started) args.push(value);
  return args;
}

/** Read process starts and argv without loading the product or requiring an A1 installation. */
export async function listSystemProcesses({ deadline = Date.now() + 10000 } = {}) {
  if (Date.now() >= deadline) throw failure("pass-deadline");
  const timeout = Math.max(1, Math.min(10000, deadline - Date.now()));
  if (process.platform === "win32") {
    const script = "$ErrorActionPreference = 'Stop'; $json = Get-CimInstance Win32_Process | Select-Object @{n='pid';e={$_.ProcessId}},@{n='parent';e={$_.ParentProcessId}},@{n='start';e={if ($_.CreationDate) {$_.CreationDate.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')}}},@{n='executable';e={$_.ExecutablePath}},@{n='command';e={if ($_.Name -ieq 'node.exe') {$_.CommandLine}}} | ConvertTo-Json -Compress; [Console]::Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)))";
    const { stdout } = await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024 });
    const parsed = JSON.parse(Buffer.from(stdout.trim(), "base64").toString("utf8") || "[]");
    return (Array.isArray(parsed) ? parsed : [parsed]).map(row => ({ ...row, argv: typeof row.command === "string" ? commandArguments(row.command) : [] }));
  }
  const { stdout } = await execute("ps", ["-axo", "pid=,ppid=,lstart=,args="], { encoding: "utf8", timeout, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, LC_ALL: "C" } });
  const rows = stdout.split("\n").flatMap(line => {
    const match = /^\s*(\d+)\s+(\d+)\s+(.{24})\s+(.*)$/u.exec(line);
    return match ? [{ pid: Number(match[1]), parent: Number(match[2]), start: match[3], argv: commandArguments(match[4]), executable: "" }] : [];
  });
  for (const row of rows) {
    if (Date.now() >= deadline) throw failure("pass-deadline");
    if (process.platform === "linux") {
      try {
        row.argv = (await readFile(`/proc/${row.pid}/cmdline`, "utf8")).split("\0").filter(Boolean);
        row.executable = await realpath(`/proc/${row.pid}/exe`);
        const state = await readFile(`/proc/${row.pid}/stat`, "utf8");
        row.start = state.slice(state.lastIndexOf(")") + 2).split(" ")[19];
      } catch (error) { if (!["ENOENT", "ESRCH", "EACCES", "EPERM"].includes(error.code)) throw error; }
    } else row.executable = row.argv[0] ?? "";
  }
  return rows;
}

/** Exact code association plus stable process start; caller ancestry is protected even after context unlinking. */
export function checkoutProcessInventory(rows, root, self = process.pid) {
  if (!Array.isArray(rows) || !rows.some(row => row.pid === self)) throw failure("development-process-inspection-unavailable");
  const protectedIds = new Set(); let current = self;
  while (current > 0 && !protectedIds.has(current)) {
    protectedIds.add(current);
    current = rows.find(row => row.pid === current)?.parent ?? 0;
  }
  const code = [resolve(root, "bin") + sep, resolve(root, "dist") + sep].map(normalized);
  const processes = [];
  for (const row of rows) {
    const script = row.argv?.[1];
    if (!/^(?:node|node\.exe)$/iu.test(basename(row.executable || row.argv?.[0] || "")) || typeof script !== "string" || !isAbsolute(script)) continue;
    const path = normalized(script);
    if (!code.some(prefix => path.startsWith(`${prefix}${sep}`))) continue;
    if (!Number.isSafeInteger(row.pid) || row.pid <= 0 || !Number.isSafeInteger(row.parent) || typeof row.start !== "string" || !row.start || !row.executable) throw failure("development-process-unverifiable");
    processes.push({ pid: row.pid, parent: row.parent, start: row.start, executable: row.executable, script: resolve(script), protected: protectedIds.has(row.pid) });
  }
  return processes;
}

/** Inspect only a real checkout's entry; fixture repositories without a product entry need no OS process scan. */
export async function inspectCheckoutProcesses(root, { list = listSystemProcesses, self = process.pid, deadline } = {}) {
  try { await realpath(resolve(root, "bin", "ui.js")); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  try { return checkoutProcessInventory(await list({ deadline }), root, self); }
  catch (error) { throw error.cleanupCode ? error : failure("development-process-inspection-unavailable"); }
}

async function terminateVerified(record, { deadline = Date.now() + 10000 } = {}) {
  if (process.platform !== "win32") { process.kill(record.pid, "SIGTERM"); return; }
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/u.test(record.start)) throw failure("development-process-unverifiable");
  // Security: pin the Windows process handle and creation time before terminating; PID reuse is not stop authority.
  const script = `$ErrorActionPreference = 'Stop'; $p = [System.Diagnostics.Process]::GetProcessById(${record.pid}); try { $null = $p.Handle; if ($p.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ') -ne '${record.start}') { throw 'development-process-identity-changed' }; $p.Kill() } finally { $p.Dispose() }`;
  await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true, timeout: Math.max(1, Math.min(10000, deadline - Date.now())) });
}

/** Explicit candidate stop only: fresh identity before every stop, bounded settling, no caller/ancestor termination. */
export async function stopCheckoutDevelopmentProcesses(root, {
  list = listSystemProcesses, terminate = terminateVerified, self = process.pid,
  sleep = milliseconds => new Promise(done => setTimeout(done, milliseconds)), passes = 4, deadline = Date.now() + 15000,
} = {}) {
  const stopped = new Set();
  const snapshot = async () => {
    if (Date.now() >= deadline) throw failure("pass-deadline");
    try { return checkoutProcessInventory(await list({ deadline }), root, self); }
    catch (error) { throw error.cleanupCode ? error : failure("development-process-inspection-unavailable"); }
  };
  for (let pass = 0; pass < passes; pass++) {
    const selected = await snapshot();
    if (selected.some(row => row.protected)) throw failure("development-process-protected");
    if (selected.length === 0) return { stopped: [...stopped], survivors: [] };
    for (const row of selected) {
      const fresh = (await snapshot()).find(candidate => candidate.pid === row.pid);
      if (!fresh) continue;
      if (fresh.protected || ["start", "parent", "executable", "script"].some(key => fresh[key] !== row[key])) throw failure("development-process-identity-changed");
      if (!stopped.has(row.pid)) {
        if (Date.now() >= deadline) throw failure("pass-deadline");
        try { await terminate(fresh, { deadline }); } catch { throw failure("development-process-stop-failed"); }
        stopped.add(row.pid);
      }
    }
    await sleep(250);
  }
  return { stopped: [...stopped], survivors: (await snapshot()).map(row => row.pid) };
}
