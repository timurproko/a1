import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

/** Pre-resource, line-mode confirmation matching Pi's cross-project CLI fork decision. */
export function createConsoleSessionForkPrompt(options: {
  readonly input?: Readable;
  readonly output?: Writable;
} = {}): (request: { readonly sourceCwd: string }) => Promise<boolean> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  return async ({ sourceCwd }) => {
    output.write(`Session found in different project: ${sourceCwd}\n`);
    const wasFlowing = input.readableFlowing;
    const readline = createInterface({ input, output });
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const finish = (accepted: boolean): void => { cleanup(); resolve(accepted); };
        const cancel = (): void => finish(false);
        const fail = (error: Error): void => { cleanup(); reject(error); };
        const cleanup = (): void => {
          readline.off("close", cancel);
          readline.off("SIGINT", cancel);
          input.off("error", fail);
        };
        readline.once("close", cancel);
        readline.once("SIGINT", cancel);
        input.once("error", fail);
        readline.question("Fork this session into current directory? [y/N] ", answer => {
          finish(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
        });
      });
    } finally {
      readline.close();
      if (wasFlowing !== true) input.pause();
    }
  };
}
