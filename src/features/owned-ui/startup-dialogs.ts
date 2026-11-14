import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

type StartupInput = Readable & { readonly isTTY?: boolean; readonly isRaw?: boolean; setRawMode?(value: boolean): unknown };

/** Small pre-resource dialogs; never advertise terminal capabilities to a headless caller. */
export function createConsoleStartupDialogs(options: {
  readonly input?: StartupInput;
  readonly output?: Writable & { readonly isTTY?: boolean };
} = {}) {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const hasUI = input.isTTY === true && output.isTTY === true;
  async function ask(title: string): Promise<string | undefined> {
    if (!hasUI) return undefined;
    const wasRaw = input.isRaw === true;
    const wasFlowing = input.readableFlowing;
    input.setRawMode?.(false);
    const readline = createInterface({ input, output, terminal: false });
    try {
      return await new Promise<string | undefined>((resolve, reject) => {
        const cleanup = (): void => { readline.off("close", cancel); readline.off("SIGINT", cancel); input.off("error", fail); };
        const cancel = (): void => { cleanup(); resolve(undefined); };
        const fail = (error: Error): void => { cleanup(); reject(error); };
        readline.once("close", cancel); readline.once("SIGINT", cancel); input.once("error", fail);
        readline.question(`${title} `, answer => { cleanup(); resolve(answer); });
      });
    } finally {
      readline.close();
      input.setRawMode?.(wasRaw);
      if (wasFlowing !== true) input.pause();
    }
  }
  const ui = {
    async select(title: string, choices: string[]): Promise<string | undefined> {
      const answer = await ask(`${title}\n${choices.map((choice, index) => `${index + 1}. ${choice}`).join("\n")}\nChoose a number (empty cancels):`);
      if (answer === undefined || !/^\d+$/u.test(answer.trim())) return undefined;
      return choices[Number(answer.trim()) - 1];
    },
    async confirm(title: string, message: string): Promise<boolean> {
      return /^(?:y|yes)$/iu.test((await ask(`${title}\n${message} [y/N]`))?.trim() ?? "");
    },
    async input(title: string, placeholder?: string): Promise<string | undefined> {
      return await ask(placeholder ? `${title} (${placeholder}):` : `${title}:`);
    },
    notify(message: string, _type?: "info" | "warning" | "error"): void {
      if (hasUI) output.write(`${message}\n`);
    },
  };
  return { hasUI, ui };
}

/** Neutral presentation port: the integration, not this dialog, owns session lookup/open. */
export function createConsoleSessionPicker(dialogs = createConsoleStartupDialogs()) {
  return async ({ sessions }: { readonly sessions: readonly { readonly path: string; readonly cwd: string; readonly name?: string; readonly firstMessage: string }[] }): Promise<string | null> => {
    const labels = sessions.map(session => `${session.name || session.firstMessage || "Unnamed session"} — ${session.path}`.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " "));
    if (labels.length === 0) { dialogs.ui.notify("No sessions available"); return null; }
    const choice = await dialogs.ui.select("Resume a session", labels);
    return choice === undefined ? null : sessions[labels.indexOf(choice)]?.path ?? null;
  };
}
