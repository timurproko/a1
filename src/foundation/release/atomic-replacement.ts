import { rename } from "node:fs/promises";

/** Dependencies for an atomic replacement; the original destination is never removed first. */
export interface AtomicReplacementOptions {
  readonly rename?: (from: string, to: string) => Promise<void>;
  readonly platform?: NodeJS.Platform;
}

/** Let brief Windows readers release a file while preserving its last committed contents. */
export async function renameFileWithRetry(temporary: string, destination: string, options: AtomicReplacementOptions = {}): Promise<void> {
  const move = options.rename ?? rename;
  const platform = options.platform ?? process.platform;
  const deadline = Date.now() + 2_000;
  for (let delay = 10; ; delay = Math.min(delay * 2, 200)) {
    try { await move(temporary, destination); return; }
    catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(String(code)) || Date.now() >= deadline) throw error;
      await new Promise(resolvePromise => setTimeout(resolvePromise, delay));
    }
  }
}
