import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
export interface OwnedProjectTrustPromptRequest {
  readonly cwd: string;
  readonly defaultDecision: "ask" | "always" | "never";
}

export type OwnedProjectTrustPrompt = (request: OwnedProjectTrustPromptRequest) => Promise<boolean | null>;

export interface ConsoleProjectTrustPromptOptions {
  readonly input?: Readable & { readonly isTTY?: boolean };
  readonly output?: Writable & { readonly isTTY?: boolean };
}

/**
 * Minimal pre-session surface. It depends only on the parent terminal and fixed
 * A1 wording, so no project setting, theme, extension, prompt, or skill can
 * execute before the decision.
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
    const reader = createInterface({ input, output, terminal: true });
    try {
      output.write(`\nA1 found project-local settings or executable resources in:\n${cwd}\n`);
      output.write("Trusting permits project settings, skills, prompts, packages, themes, and extensions to load.\n");
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const answer = (await reader.question("Trust this project for this and future launches? [y/N] ")).trim().toLowerCase();
        if (answer === "y" || answer === "yes") return true;
        if (answer === "" || answer === "n" || answer === "no") return false;
        output.write("Enter y or n.\n");
      }
      return null;
    } finally {
      reader.close();
    }
  };
}
