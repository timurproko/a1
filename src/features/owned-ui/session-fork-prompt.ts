import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

/** Pre-resource, line-mode confirmation matching Pi's cross-project CLI fork decision. */
export function createConsoleSessionForkPrompt(options: {
  readonly input?: Readable;
  readonly output?: Writable;
} = {}): (request: { readonly sourceCwd: string; readonly fallbackCwd?: string }) => Promise<boolean | "continue" | "fork" | "cancel"> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  return async ({ sourceCwd, fallbackCwd }) => {
    const recovering = fallbackCwd !== undefined;
    output.write(recovering
      ? `Session cwd does not exist: ${sourceCwd}\n1. Continue in ${fallbackCwd} (asks again next time)\n2. Fork into ${fallbackCwd} (new session ID, original kept)\n3. Cancel\n`
      : `Session found in different project: ${sourceCwd}\n`);
    const wasFlowing = input.readableFlowing;
    const readline = createInterface({ input, output });
    try {
      return await new Promise<boolean | "continue" | "fork" | "cancel">((resolve, reject) => {
        const finish = (accepted: boolean | "continue" | "fork" | "cancel"): void => { cleanup(); resolve(accepted); };
        const cancel = (): void => finish(recovering ? "cancel" : false);
        const fail = (error: Error): void => { cleanup(); reject(error); };
        const cleanup = (): void => {
          readline.off("close", cancel);
          readline.off("SIGINT", cancel);
          input.off("error", fail);
        };
        readline.once("close", cancel);
        readline.once("SIGINT", cancel);
        input.once("error", fail);
        readline.question(recovering ? "Choose Continue, Fork, or Cancel [1/2/3]: " : "Fork this session into current directory? [y/N] ", answer => {
          const choice = answer.trim().toLowerCase();
          finish(recovering
            ? choice === "1" || choice === "continue" ? "continue" : choice === "2" || choice === "fork" ? "fork" : "cancel"
            : choice === "y" || choice === "yes");
        });
      });
    } finally {
      readline.close();
      if (wasFlowing !== true) input.pause();
    }
  };
}
