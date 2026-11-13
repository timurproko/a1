import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rmdir, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export const HERDR_IDENTITY_LABELS = Object.freeze({
  session: `${PRODUCT_IDENTITY.protocol.namespace}.session`,
  runtime: `${PRODUCT_IDENTITY.protocol.namespace}.runtime`,
  at: `${PRODUCT_IDENTITY.protocol.namespace}.at`,
});

const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
export interface HerdrPublishedBinding { readonly runtimeId: string; readonly sessionId: string; readonly at: string }
interface BindingState { version: 1; generation: number; runtimeId: string; published?: HerdrPublishedBinding }
export interface HerdrBindingReservation { readonly terminalId: string; readonly runtimeId: string; readonly generation: number; readonly file: string }

/** Complete local IDs only; mutable names and remote selectors are never publication targets. */
export function validHerdrIdentity(terminalId: string, runtimeId: string, sessionId?: string): boolean {
  return /^t[0-9a-z]{1,16}$/u.test(terminalId) && UUID.test(runtimeId) && (sessionId === undefined || UUID.test(sessionId));
}

/** Reserve before asynchronous startup can delay an older runtime. Never publishes Core labels. */
export async function reserveHerdrBinding(runtimeId: string, environment: NodeJS.ProcessEnv = process.env, directory = join(homedir(), ".a1", "herdr-bindings")): Promise<HerdrBindingReservation | undefined> {
  const terminalId = environment.HC_TERMINAL_ID;
  if (!terminalId || !validHerdrIdentity(terminalId, runtimeId)) return undefined;
  try {
    const canonicalDirectory = await safeDirectory(directory);
    // Security: even alternate local Core contexts share this conservative per-user fence.
    const file = join(canonicalDirectory, `${createHash("sha256").update(terminalId).digest("hex")}.json`);
    let unlock: (() => Promise<void>) | undefined;
    const deadline = performance.now() + 250;
    do {
      unlock = await lock(file);
      if (!unlock) await new Promise(done => setTimeout(done, 20));
    } while (!unlock && performance.now() < deadline);
    if (!unlock) return undefined;
    try {
      const prior = await readState(file);
      const generation = (prior?.generation ?? 0) + 1;
      if (!Number.isSafeInteger(generation)) return undefined;
      await writeState(file, { version: 1, generation, runtimeId, ...(prior?.published ? { published: prior.published } : {}) });
      return Object.freeze({ terminalId, runtimeId, generation, file });
    } finally { await unlock(); }
  } catch { return undefined; }
}

/** Hold the exact terminal fence through public Core reads/writes and their verified settlement. */
export async function withHerdrBinding(reservation: HerdrBindingReservation, action: (state: BindingState) => Promise<void>): Promise<void> {
  let unlock: (() => Promise<void>) | undefined;
  let settled = true;
  try {
    await safeDirectory(dirname(reservation.file));
    unlock = await lock(reservation.file);
    if (!unlock) return;
    const state = await readState(reservation.file);
    if (!state || state.runtimeId !== reservation.runtimeId || state.generation !== reservation.generation) return;
    await action(state);
    await writeState(reservation.file, state);
  } catch (error) {
    // Security: never steal/release a fence while an unverified child could still write Core.
    settled = !(error && typeof error === "object" && "settled" in error && error.settled === false);
  } finally { if (settled) await unlock?.().catch(() => {}); }
}

async function safeDirectory(directory: string): Promise<string> {
  const selected = resolve(directory), temporaryRoot = resolve(tmpdir());
  const child = relative(temporaryRoot, selected);
  // Compatibility: macOS's OS-selected temp root traverses /var -> /private/var.
  // Security: canonicalize only that trusted root, never caller-selected links beneath it.
  const absolute = child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child)
    ? resolve(await realpath(temporaryRoot), child) : selected;
  const ancestors: string[] = [];
  for (let path = absolute;; path = dirname(path)) { ancestors.unshift(path); if (dirname(path) === path) break; }
  for (const path of ancestors) {
    let stat;
    try { stat = await lstat(path); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(path, { mode: 0o700 }); stat = await lstat(path);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe binding directory");
  }
  return await realpath(absolute);
}
async function lock(file: string): Promise<(() => Promise<void>) | undefined> {
  try { await mkdir(`${file}.lock`, { mode: 0o700 }); } catch { return undefined; }
  // Security: no age/PID-based stealing; crash residue disables reporting, never normal A1 startup.
  return () => rmdir(`${file}.lock`);
}
async function readState(file: string): Promise<BindingState | undefined> {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw new Error("Unsafe binding record");
    const value = JSON.parse(await readFile(file, "utf8")) as BindingState;
    if (value.version !== 1 || !Number.isSafeInteger(value.generation) || value.generation < 1 || !UUID.test(value.runtimeId)) throw new Error("Invalid binding fence");
    if (value.published && (!UUID.test(value.published.runtimeId) || !UUID.test(value.published.sessionId) || !/^\d{1,16}$/u.test(value.published.at))) throw new Error("Invalid publication record");
    return value;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}
async function writeState(file: string, state: BindingState): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: "wx" });
  await rename(temporary, file);
}
