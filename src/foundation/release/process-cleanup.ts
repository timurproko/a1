import { spawn } from "node:child_process";
import type { SupervisorEndpointMetadata } from "./cohort-state.js";

export interface CleanupDiagnostics {
  readonly pid: number;
  readonly attempted: readonly string[];
  readonly terminated: boolean;
  readonly elapsedMs: number;
}

export function processIsAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}

export async function cleanupProvenIdleOwner(metadata: SupervisorEndpointMetadata, graceMs = 1_500): Promise<CleanupDiagnostics> {
  return await cleanupVerifiedOwner(metadata, { graceMs, allowLiveInstances: false });
}

export async function cleanupVerifiedOwner(
  metadata: SupervisorEndpointMetadata,
  options: { readonly graceMs?: number; readonly allowLiveInstances?: boolean; readonly reason?: "stale-idle-owner" | "explicit-update" | "legacy-mutable-install" } = {},
): Promise<CleanupDiagnostics> {
  const graceMs = options.graceMs ?? 1_500;
  if (!options.allowLiveInstances && (metadata.ownership.liveInstanceIds.length > 0 || metadata.ownership.nonResumableInstanceIds.length > 0)) {
    throw new Error("refusing to terminate an owner with recorded live generations");
  }
  const started = Date.now();
  const attempted: string[] = [];
  if (!processIsAlive(metadata.pid)) return { pid: metadata.pid, attempted: ["owner-already-dead"], terminated: true, elapsedMs: Date.now() - started };

  attempted.push("graceful-termination");
  await terminate(metadata.pid, false);
  if (await waitUntilDead(metadata.pid, graceMs)) return { pid: metadata.pid, attempted, terminated: true, elapsedMs: Date.now() - started };

  attempted.push("forced-process-tree-termination");
  await terminate(metadata.pid, true);
  const terminated = await waitUntilDead(metadata.pid, graceMs);
  return { pid: metadata.pid, attempted, terminated, elapsedMs: Date.now() - started };
}

async function terminate(pid: number, force: boolean): Promise<void> {
  if (process.platform === "win32") {
    await new Promise<void>(resolvePromise => {
      const child = spawn("taskkill.exe", ["/PID", String(pid), "/T", ...(force ? ["/F"] : [])], {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
      });
      child.once("error", () => resolvePromise());
      child.once("close", () => resolvePromise());
    });
    return;
  }
  const signal = force ? "SIGKILL" : "SIGTERM";
  try { process.kill(-pid, signal); }
  catch {
    try { process.kill(pid, signal); } catch {}
  }
}

async function waitUntilDead(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processIsAlive(pid)) return true;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  return !processIsAlive(pid);
}
