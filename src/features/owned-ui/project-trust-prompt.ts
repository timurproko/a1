import type { Readable, Writable } from "node:stream";

export interface OwnedProjectTrustPromptRequest {
  readonly cwd: string;
  readonly defaultDecision: "ask" | "always" | "never";
}

export type OwnedProjectTrustPrompt = (request: OwnedProjectTrustPromptRequest) => Promise<boolean | null>;

interface RawTtyInput extends Readable {
  readonly isTTY?: boolean;
  readonly isRaw?: boolean;
  setRawMode?(enabled: boolean): this;
}

export interface ConsoleProjectTrustPromptOptions {
  readonly input?: RawTtyInput;
  readonly output?: Writable & { readonly isTTY?: boolean; readonly columns?: number };
}

const ENTER_ALTERNATE_SCREEN = "\u001b[?1049h";
const LEAVE_ALTERNATE_SCREEN = "\u001b[?1049l";
const HIDE_CURSOR = "\u001b[?25l";
const SHOW_CURSOR = "\u001b[?25h";
const CLEAR_HOME = "\u001b[2J\u001b[H";
const ACCENT = "\u001b[38;2;138;190;183m";
const MUTED = "\u001b[38;2;128;128;128m";
const DIM = "\u001b[38;2;102;102;102m";
const RESET_FG = "\u001b[39m";
const BOLD = "\u001b[1m";
const RESET_BOLD = "\u001b[22m";

/**
 * Pre-resource startup selector. It uses only fixed product wording and terminal
 * controls: no project setting, theme, extension, prompt, package, or skill is
 * consulted before the trust result exists.
 */
export function createConsoleProjectTrustPrompt(
  options: ConsoleProjectTrustPromptOptions = {},
): OwnedProjectTrustPrompt {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  return async ({ cwd }) => {
    if (input.isTTY !== true || output.isTTY !== true) {
      throw new Error("an interactive terminal is unavailable");
    }

    const wasRaw = input.isRaw === true;
    let selected = 0;
    let restored = false;
    const restore = (): void => {
      if (restored) return;
      restored = true;
      input.setRawMode?.(wasRaw);
      output.write(`${CLEAR_HOME}${SHOW_CURSOR}${LEAVE_ALTERNATE_SCREEN}`);
    };
    const render = (): void => {
      const width = Math.max(20, output.columns ?? 80);
      const lines = [
        `${BOLD}${ACCENT}Trust project folder?${RESET_FG}${RESET_BOLD}`,
        cwd,
        "",
        "This allows A1 to load project settings and resources, install missing project packages, and execute project extensions.",
        "",
        optionRow("Trust", selected === 0),
        optionRow("Do not trust", selected === 1),
        "",
        `${DIM}  ↑/↓ to navigate · Enter to select · Esc to cancel${RESET_FG}`,
      ];
      output.write(`${CLEAR_HOME}${lines.map(line => clipAnsiSafe(line, width)).join("\n")}`);
    };

    try {
      output.write(`${ENTER_ALTERNATE_SCREEN}${HIDE_CURSOR}`);
      input.setRawMode?.(true);
      render();
      return await new Promise<boolean | null>((resolve, reject) => {
        let settled = false;
        const finish = (value: boolean | null): void => {
          if (settled) return;
          settled = true;
          cleanup();
          restore();
          resolve(value);
        };
        const fail = (error: Error): void => {
          if (settled) return;
          settled = true;
          cleanup();
          restore();
          reject(error);
        };
        const onData = (chunk: Buffer | string): void => {
          const data = chunk.toString();
          for (let index = 0; index < data.length;) {
            if (data.startsWith("\u001b[A", index)) {
              selected = 0;
              index += 3;
              render();
              continue;
            }
            if (data.startsWith("\u001b[B", index) || data[index] === "\t") {
              selected = selected === 0 ? 1 : 0;
              index += data[index] === "\t" ? 1 : 3;
              render();
              continue;
            }
            const key = data[index] ?? "";
            index += 1;
            if (key === "\r" || key === "\n") {
              finish(selected === 0);
              return;
            }
            if (key === "\u001b" || key === "\u0003") {
              finish(null);
              return;
            }
            // Retain y/n aliases for terminals or automation that cannot send
            // navigation keys; the visible interaction remains selector-first.
            if (key === "y" || key === "Y") {
              finish(true);
              return;
            }
            if (key === "n" || key === "N") {
              finish(false);
              return;
            }
          }
        };
        const onEnd = (): void => finish(null);
        const onError = (error: Error): void => fail(error);
        const cleanup = (): void => {
          input.off("data", onData);
          input.off("end", onEnd);
          input.off("error", onError);
        };
        input.on("data", onData);
        input.once("end", onEnd);
        input.once("error", onError);
        input.resume();
      });
    } finally {
      restore();
    }
  };
}

function optionRow(label: string, selected: boolean): string {
  return selected
    ? `${ACCENT}→ ${label}${RESET_FG}`
    : `  ${label}`;
}

/** Avoid replaying or manufacturing control payloads while keeping fixed SGR. */
function clipAnsiSafe(line: string, width: number): string {
  let visible = 0;
  let output = "";
  for (let index = 0; index < line.length && visible < width;) {
    if (line[index] === "\u001b") {
      const match = line.slice(index).match(/^\u001b\[[0-9;:]*m/);
      if (match !== null) {
        output += match[0];
        index += match[0].length;
        continue;
      }
    }
    output += line[index];
    index += 1;
    visible += 1;
  }
  return `${output}${RESET_FG}${RESET_BOLD}`;
}
