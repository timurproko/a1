import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, open, realpath, rename, unlink, writeFile, chmod } from "node:fs/promises";
import { createConnection, createServer, type Socket } from "node:net";
import { join, resolve } from "node:path";
import { inspectLiveProcess } from "./process-liveness.js";
import type { ProcessIdentity } from "./model.js";

export interface SessionControlIdentity {
  readonly sessionId: string;
  readonly binding: number;
}
interface Registration extends SessionControlIdentity {
  readonly version: 1;
  readonly id: string;
  readonly runtimeId: string;
  readonly owner: ProcessIdentity;
  readonly nonce: string;
}
interface ControlOptions {
  readonly runtimeDir: string;
  readonly inspectProcess?: (pid: number) => Promise<ProcessIdentity | null>;
}
export interface SessionControlHostOptions extends ControlOptions {
  readonly runtimeId: string;
  readonly identity: () => SessionControlIdentity;
  readonly handle: (payload: unknown) => Promise<unknown>;
}
export interface SessionControlRequestOptions extends ControlOptions {
  readonly sessionId: string;
  readonly runtimeId?: string;
  readonly payload: unknown;
  readonly timeoutMs?: number;
}

const LIMIT = 8192;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
const SLUG = /^[a-z0-9-]{1,128}$/iu;
const fail = (code: string, message: string) => Object.assign(new Error(message), { code });
const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);
async function address(directory: string, id: string, create: boolean): Promise<string> {
  if (process.platform === "win32") return `\\\\.\\pipe\\session-control-${hash(directory)}-${id}`;
  const local = join(directory, `${id}.sock`);
  // Compatibility: retain working endpoints, but Darwin allows only 103 pathname bytes.
  if (Buffer.byteLength(local) < 104) return local;
  const uid = process.getuid!();
  const transport = join(await realpath("/tmp"), `session-control-${uid}`);
  if (create) await mkdir(transport, { mode: 0o700 }).catch(error => { if (error.code !== "EEXIST") throw error; });
  const stat = await lstat(transport);
  // Security: a shared temp root must never admit a foreign, linked, or permissive transport directory.
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid || (stat.mode & 0o077) !== 0
    || await realpath(transport) !== transport) throw fail("control-boundary", "Session control transport directory is not private.");
  return join(transport, `${hash(`${directory}\0${id}`)}.sock`);
}

async function privateDirectory(runtimeDir: string, create: boolean): Promise<string> {
  const selectedRoot = resolve(runtimeDir);
  if (create) await mkdir(selectedRoot, { recursive: true, mode: 0o700 });
  const root = await realpath(selectedRoot);
  const directory = join(root, "session-controls");
  if (create) await mkdir(directory, { mode: 0o700 }).catch(error => { if (error.code !== "EEXIST") throw error; });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || resolve(await realpath(directory)) !== directory) {
    throw fail("control-boundary", "Session control directory is not a private regular directory.");
  }
  if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) throw fail("control-boundary", "Session control directory permissions are not private.");
  return directory;
}

async function readRegistration(file: string): Promise<Registration> {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > LIMIT || (process.platform !== "win32" && (stat.mode & 0o077) !== 0)) {
    throw fail("control-boundary", "Invalid session control record.");
  }
  const handle = await open(file, "r");
  let raw: string;
  try {
    const opened = await handle.stat();
    if (opened.dev !== stat.dev || opened.ino !== stat.ino || !opened.isFile()) throw fail("control-boundary", "Session control record changed during lookup.");
    const buffer = Buffer.alloc(LIMIT + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > LIMIT) throw fail("control-boundary", "Session control record exceeds the size limit.");
    raw = buffer.subarray(0, bytesRead).toString("utf8");
  } finally { await handle.close(); }
  let value: Registration;
  try { value = JSON.parse(raw) as Registration; } catch { throw fail("control-boundary", "Malformed session control record."); }
  if (!value || typeof value !== "object") throw fail("control-boundary", "Malformed session control record.");
  if (value.version !== 1 || !UUID.test(value.id) || !UUID.test(value.sessionId) || typeof value.runtimeId !== "string" || !SLUG.test(value.runtimeId)
    || !UUID.test(value.nonce) || !Number.isSafeInteger(value.binding) || value.binding < 0
    || !Number.isSafeInteger(value.owner?.pid) || value.owner.pid <= 0 || typeof value.owner.startIdentity !== "string") {
    throw fail("control-boundary", "Malformed session control record.");
  }
  return value;
}

function receive(socket: Socket, consume: (value: unknown) => void): void {
  let data = "", complete = false;
  socket.setEncoding("utf8");
  socket.on("data", chunk => {
    if (complete) { socket.destroy(); return; }
    data += chunk;
    if (Buffer.byteLength(data) > LIMIT) { socket.destroy(); return; }
    const newline = data.indexOf("\n");
    if (newline < 0) return;
    complete = true;
    if (data.slice(newline + 1).trim() !== "") { socket.destroy(); return; }
    try { consume(JSON.parse(data.slice(0, newline))); } catch { socket.destroy(); }
  });
}

export async function serveSessionControl(options: SessionControlHostOptions): Promise<{ publish(): Promise<void>; dispose(): Promise<void> }> {
  if (!SLUG.test(options.runtimeId)) throw fail("session-unavailable", "Runtime identity is invalid.");
  const directory = await privateDirectory(options.runtimeDir, true);
  const inspect = options.inspectProcess ?? inspectLiveProcess;
  const owner = await inspect(process.pid);
  if (!owner || owner.pid !== process.pid || !owner.startIdentity) throw fail("session-unavailable", "Runtime identity cannot be verified.");
  const id = randomUUID(), nonce = randomUUID(), file = join(directory, `${id}.json`);
  const endpoint = await address(directory, id, true);
  let disposed = false, queue = Promise.resolve(), publication = Promise.resolve();
  const sockets = new Set<Socket>();
  const server = createServer(socket => {
    sockets.add(socket);
    socket.setTimeout(5000, () => socket.destroy());
    socket.on("error", () => {});
    socket.on("close", () => sockets.delete(socket));
    receive(socket, input => {
      queue = queue.then(async () => {
        try {
          const request = input as Registration & { deadline: number; requestId: string; payload: unknown };
          const current = options.identity();
          if (disposed || socket.destroyed || request.nonce !== nonce || request.runtimeId !== options.runtimeId
            || request.sessionId !== current.sessionId || request.binding !== current.binding) {
            throw fail("session-unavailable", "The selected session is no longer active.");
          }
          if (!UUID.test(request.requestId) || !Number.isFinite(request.deadline) || request.deadline <= Date.now() || request.deadline > Date.now() + 5000) {
            throw fail("request-expired", "Session request expired before application.");
          }
          // Concurrency: no await separates the identity/deadline check from calling the live handler.
          const result = await options.handle(request.payload);
          if (!socket.destroyed) socket.end(`${JSON.stringify({ requestId: request.requestId, result })}\n`);
        } catch (error) {
          const failure = error as Error & { code?: string };
          if (!socket.destroyed) socket.end(`${JSON.stringify({ error: { code: failure.code ?? "control-failed", message: failure.message } })}\n`);
        }
      }).catch(() => { socket.destroy(); });
    });
  });
  await new Promise<void>((done, reject) => { server.once("error", reject); server.listen(endpoint, () => { server.off("error", reject); done(); }); });
  server.on("error", () => {});
  server.maxConnections = 64;
  const publish = () => {
    publication = publication.catch(() => {}).then(async () => {
      if (disposed) return;
      const identity = options.identity();
      if (!UUID.test(identity.sessionId) || !Number.isSafeInteger(identity.binding) || identity.binding < 0) throw fail("session-unavailable", "Session identity is not available.");
      const temporary = join(directory, `${id}.${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify({ version: 1, id, nonce, runtimeId: options.runtimeId, owner, ...identity }), { mode: 0o600, flag: "wx" });
        await rename(temporary, file);
      } finally { await unlink(temporary).catch(() => {}); }
    });
    return publication;
  };
  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(done => server.close(() => done()));
    await queue;
    await publication.catch(() => {});
    await unlink(file).catch(() => {});
  };
  try {
    if (process.platform !== "win32") await chmod(endpoint, 0o600);
    await publish();
  } catch (error) { await dispose(); throw error; }
  return { publish, dispose };
}

export async function requestSessionControl(options: SessionControlRequestOptions): Promise<unknown> {
  if (!UUID.test(options.sessionId)) throw fail("invalid-session", "Supply a complete session UUID.");
  const budget = Math.min(5000, Math.max(1, options.timeoutMs ?? 3000));
  const deadline = Date.now() + budget;
  const directory = await privateDirectory(options.runtimeDir, false).catch(() => { throw fail("session-unavailable", "No live session control is available."); });
  const names = (await readdir(directory)).filter(name => UUID.test(name.slice(0, -5)) && name.endsWith(".json"));
  if (names.length > 256) throw fail("control-limit", "Too many session records to resolve safely.");
  const matches: Registration[] = [];
  for (const name of names) {
    const record = await readRegistration(join(directory, name)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    if (record === null || `${record.id}.json` !== name || record.sessionId !== options.sessionId || (options.runtimeId !== undefined && record.runtimeId !== options.runtimeId)) continue;
    const owner = await (options.inspectProcess ?? inspectLiveProcess)(record.owner.pid);
    if (owner?.startIdentity === record.owner.startIdentity) matches.push(record);
    if (Date.now() >= deadline) throw fail("request-expired", "Session lookup exceeded its deadline.");
  }
  if (matches.length !== 1) throw fail(matches.length > 1 ? "ambiguous-session" : "session-unavailable", "Select one running bare session by its complete session id.");
  const record = matches[0]!;
  const endpoint = await address(directory, record.id, false);
  return await new Promise((done, reject) => {
    const socket = createConnection(endpoint);
    const requestId = randomUUID();
    const timer = setTimeout(() => { socket.destroy(); reject(fail("request-expired", "Session request timed out; application was not acknowledged.")); }, Math.max(1, deadline - Date.now()));
    const finish = () => { clearTimeout(timer); socket.destroy(); };
    socket.on("error", () => { finish(); reject(fail("session-unavailable", "The selected session could not be reached.")); });
    socket.on("close", () => { clearTimeout(timer); reject(fail("session-unavailable", "The selected session closed before acknowledgement.")); });
    socket.on("connect", () => socket.write(`${JSON.stringify({ ...record, requestId, deadline, payload: options.payload })}\n`));
    receive(socket, input => {
      const response = input as { requestId?: string; result?: unknown; error?: { code: string; message: string } };
      finish();
      if (response.error) reject(fail(response.error.code, response.error.message));
      else if (response.requestId !== requestId) reject(fail("control-failed", "Session acknowledgement did not match the request."));
      else done(response.result);
    });
  });
}
