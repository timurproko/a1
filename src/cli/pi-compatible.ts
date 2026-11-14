import { interactiveLaunchIntent, type InteractiveLaunchIntent } from "../features/launch/index.js";
import type { RuntimeLaunchOptions } from "../foundation/launch-context/index.js";
import type { CliOutput } from "./dispatch.js";
import { interactiveOptionHelp, parseInteractiveCommand } from "./interactive-options.js";

export type PiCompatibleCommand =
  | { readonly kind: "help" | "version" }
  | { readonly kind: "catalog"; readonly search?: string; readonly runtimeOptions: RuntimeLaunchOptions }
  | { readonly kind: "launch"; readonly intent: InteractiveLaunchIntent }
  | { readonly kind: "control"; readonly arguments: readonly string[] }
  | { readonly kind: "error"; readonly message: string };

/** Naming adapter only: public options and runtime features are shared with ordinary A1. */
export function parsePiCompatibleCommand(arguments_: readonly string[], cwd = process.cwd()): PiCompatibleCommand {
  if (arguments_.length === 1 && ["--help", "-h"].includes(arguments_[0]!)) return { kind: "help" };
  if (arguments_.length === 1 && ["--version", "-v"].includes(arguments_[0]!)) return { kind: "version" };
  const [word, ...rest] = arguments_;
  if (["install", "remove", "uninstall", "list", "update", "config", "auth", "mcp"].includes(word ?? "")) {
    if (word === "uninstall" && (rest.length === 0 || rest.every(value => value === "--yes" || value === "--purge"))) {
      return { kind: "error", message: "Missing remove source. Use a1 uninstall to remove the application." };
    }
    const mapped = word === "update" && rest.length === 1 && ["self", "pi", "--self"].includes(rest[0]!) ? ["update"] : arguments_;
    return { kind: "control", arguments: mapped };
  }
  const command = parseInteractiveCommand(arguments_, cwd);
  if (command.kind !== "launch") return command;
  return { kind: "launch", intent: interactiveLaunchIntent("a1", command.sessionSelection, command) };
}

export async function dispatchPiCompatibleCommand(
  command: PiCompatibleCommand,
  handlers: {
    readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
    readonly version: () => Promise<number>;
    readonly catalog: (options: RuntimeLaunchOptions, search?: string) => Promise<number>;
    readonly control?: (arguments_: readonly string[]) => Promise<number>;
  },
  output: CliOutput,
): Promise<number> {
  if (command.kind === "error") { output.stderr(`A1: ${command.message}\n`); return 2; }
  if (command.kind === "help") {
    output.stdout(["A1 Pi naming entry (normal A1 UI and profile; not Pi comparison)", "Usage: pi [options] [--] [instructions]", ...interactiveOptionHelp(), "Leading Pi maintenance words are commands; use -- before a literal command word.", "Only a1 is globally registered; the pi naming shim is opt-in.", ""].join("\n"));
    return 0;
  }
  if (command.kind === "version") return handlers.version();
  if (command.kind === "catalog") return handlers.catalog(command.runtimeOptions, command.search);
  if (command.kind === "launch") return handlers.launch(command.intent);
  if (command.kind === "control" && handlers.control) return handlers.control(command.arguments);
  output.stderr("A1: control commands are unavailable in this host.\n");
  return 2;
}
