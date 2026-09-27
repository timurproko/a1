import type { Readable, Writable } from "node:stream";
import { EMERGENCY_TERMINAL_RESET } from "../../foundation/terminal-cleanup/terminal-reset.js";

export type OwnedProjectTrustChoiceId =
  | "trust"
  | "trust-parent"
  | "trust-session"
  | "deny"
  | "deny-session";

export interface OwnedProjectTrustPromptRequest {
  readonly cwd: string;
  readonly defaultDecision: "ask" | "always" | "never";
  readonly choices: readonly { readonly id: OwnedProjectTrustChoiceId; readonly label: string }[];
}

export type OwnedProjectTrustPrompt = (request: OwnedProjectTrustPromptRequest) => Promise<OwnedProjectTrustChoiceId | null>;

interface RawTtyInput extends Readable {
  readonly isTTY?: boolean;
  readonly isRaw?: boolean;
  setRawMode?(enabled: boolean): this;
}

export interface ConsoleProjectTrustPromptOptions {
  readonly input?: RawTtyInput;
  readonly output?: Writable & { readonly isTTY?: boolean; readonly columns?: number; readonly rows?: number };
  readonly presentation?: "bare" | "comparison";
}

const ENTER_ALTERNATE_SCREEN = "\u001b[?1049h";
const HIDE_CURSOR = "\u001b[?25l";
const CLEAR_HOME = "\u001b[2J\u001b[H";
const ACCENT = "\u001b[38;2;138;190;183m";
const MUTED = "\u001b[38;2;128;128;128m";
const DIM = "\u001b[38;2;102;102;102m";
const RESET_FG = "\u001b[39m";
const BOLD = "\u001b[1m";
const RESET_BOLD = "\u001b[22m";
const PROJECT_TRUST_EXIT = "ProjectTrustPromptExitError";

class ProjectTrustPromptExitError extends Error {
  readonly exitCode = 0;
  constructor() {
    super("Project trust prompt exited");
    this.name = PROJECT_TRUST_EXIT;
  }
}

/** Fixed pre-resource selector; no project resource is available. */
export function createConsoleProjectTrustPrompt(
  options: ConsoleProjectTrustPromptOptions = {},
): OwnedProjectTrustPrompt {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  return async ({ cwd, choices }) => {
    if (input.isTTY !== true || output.isTTY !== true) {
      throw new Error("an interactive terminal is unavailable");
    }
    if (choices.length === 0) throw new Error("project trust choices are unavailable");
    const comparison = options.presentation === "comparison";
    const renderBareDialog = comparison
      ? undefined : (await import("./project-trust-dialog.js")).renderProjectTrustDialog;

    const wasRaw = input.isRaw === true;
    let selected = 0;
    let restored = false;
    const restore = (): void => {
      if (restored) return;
      restored = true;
      input.setRawMode?.(wasRaw);
      output.write(`${CLEAR_HOME}${EMERGENCY_TERMINAL_RESET}`);
    };
    const render = (): void => {
      const width = Math.max(renderBareDialog ? 1 : 20, output.columns ?? 80);
      const rows = Math.max(1, output.rows ?? 24);
      const lines = (renderBareDialog?.(cwd, choices.map(choice => choice.label), selected, width, rows) ?? [
        `${BOLD}${ACCENT}Trust project folder?${RESET_FG}${RESET_BOLD}`,
        cwd,
        "",
        "This allows a1 to load project settings and resources, install missing project packages, and execute project extensions.",
        "",
        ...choices.map((choice, index) => optionRow(choice.label, selected === index)),
        "",
        `${DIM}↑/↓${MUTED} to navigate  ${DIM}Enter${MUTED} to select  ${DIM}Esc${MUTED} to cancel${RESET_FG}`,
      ]).map(line => clipAnsiSafe(line, width));
      const padding = renderBareDialog === undefined ? "" : "\n".repeat(Math.max(0, rows - lines.length));
      output.write(`${CLEAR_HOME}${padding}${lines.join("\n")}`);
    };

    try {
      output.write(`${ENTER_ALTERNATE_SCREEN}${HIDE_CURSOR}`);
      input.setRawMode?.(true);
      render();
      return await new Promise<OwnedProjectTrustChoiceId | null>((resolve, reject) => {
        let settled = false;
        const finish = (value: OwnedProjectTrustChoiceId | null): void => {
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
          // Protocol: restoration preserves the parent cursor; only the shell paints there.
          reject(error);
        };
        const onData = (chunk: Buffer | string): void => {
          const data = chunk.toString();
          for (let index = 0; index < data.length;) {
            if (data.startsWith("\u001b[A", index)) {
              selected = (selected - 1 + choices.length) % choices.length;
              index += 3;
              render();
              continue;
            }
            if (data.startsWith("\u001b[B", index) || data[index] === "\t") {
              selected = (selected + 1) % choices.length;
              index += data[index] === "\t" ? 1 : 3;
              render();
              continue;
            }
            const key = data[index] ?? "";
            index += 1;
            if (key === "\r" || key === "\n") {
              finish(choices[selected]?.id ?? null);
              return;
            }
            if (key === "\u001b") {
              if (comparison) finish(null);
              else fail(new ProjectTrustPromptExitError());
              return;
            }
            if (key === "\u0003") {
              if (comparison) {
                finish(null);
                return;
              }
              continue;
            }
            // Compatibility: retain y/n aliases for terminals or automation that cannot send
            // navigation keys; the visible interaction remains selector-first.
            if (key === "y" || key === "Y") {
              finish(choices.find(choice => choice.id === "trust")?.id ?? null);
              return;
            }
            if (key === "n" || key === "N") {
              finish(choices.find(choice => choice.id === "deny")?.id ?? null);
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
