import { resolve } from "node:path";
import { interactiveLaunchIntent, parseInteractiveLaunchArguments, type InteractiveLaunchIntent } from "../features/launch/index.js";
import { validateRuntimeLaunchOptions, type RuntimeLaunchOptions } from "../foundation/launch-context/index.js";
import type { CliOutput } from "./dispatch.js";

export type PiCompatibleCommand =
  | { readonly kind: "help" | "version" }
  | { readonly kind: "catalog"; readonly search?: string; readonly runtimeOptions: RuntimeLaunchOptions }
  | { readonly kind: "launch"; readonly intent: InteractiveLaunchIntent }
  | { readonly kind: "error"; readonly message: string };

const UNSUPPORTED = new Set(["--mode", "--print", "--approve", "--no-approve", "--tui-mode", "--api-key", "--models", "--no-session", "--continue", "--resume", "--fork"]);

/** A deliberately separate grammar: ordinary A1 command words remain unambiguous. */
export function parsePiCompatibleCommand(arguments_: readonly string[], cwd: string = process.cwd()): PiCompatibleCommand {
  try {
    if (arguments_.length === 1 && ["--help", "-h"].includes(arguments_[0]!)) return { kind: "help" };
    if (arguments_.length === 1 && ["--version", "-v"].includes(arguments_[0]!)) return { kind: "version" };
    const owned: string[] = [], prompt: string[] = [], extensions: string[] = [], flags: [string, string | boolean][] = [];
    const single = new Map<string, string>();
    let catalog = false, search: string | undefined;
    for (let index = 0; index < arguments_.length; index++) {
      const name = arguments_[index]!;
      if (name === "--") { prompt.push(...arguments_.slice(index + 1)); break; }
      if (!name.startsWith("-")) { prompt.push(name); continue; }
      if (UNSUPPORTED.has(name) || ["--help", "-h", "--version", "-v", "--runtime-options"].includes(name)) throw new Error(`Unsupported option in this invocation: ${name}`);
      if (name === "--list-models") {
        if (catalog) throw new Error("--list-models may occur only once");
        catalog = true;
        if (arguments_[index + 1] !== undefined && !arguments_[index + 1]!.startsWith("-")) search = arguments_[++index];
        continue;
      }
      if (["--model", "--provider", "--thinking", "--exclude-tools", "--session", "--session-dir", "--session-color", "-e", "--extension"].includes(name)) {
        const value = arguments_[++index];
        if (value === undefined || value.length === 0 || value.startsWith("--")) throw new Error(`${name} requires a value`);
        if (name === "-e" || name === "--extension") { extensions.push(value.startsWith("builtin:") ? value : resolve(cwd, value)); continue; }
        if (single.has(name)) throw new Error(`${name} may occur only once`);
        single.set(name, value);
        if (["--session", "--session-color"].includes(name)) owned.push(name, value);
        continue;
      }
      // Loaded extension registrations are authoritative; never accept arbitrary short flags.
      if (!/^--[a-z][a-z0-9-]*$/u.test(name)) throw new Error(`Unsupported option: ${name}`);
      const value = arguments_[index + 1];
      flags.push([name.slice(2), value !== undefined && !value.startsWith("-") ? arguments_[++index]! : true]);
    }
    if (single.has("--session") && single.has("--session-dir")) owned.push("--session-dir", single.get("--session-dir")!);
    const runtimeOptions = validateRuntimeLaunchOptions({
      ...(single.has("--session-dir") ? { sessionDir: resolve(cwd, single.get("--session-dir")!) } : {}),
      ...(single.has("--model") ? { model: single.get("--model") } : {}),
      ...(single.has("--provider") ? { provider: single.get("--provider") } : {}),
      ...(single.has("--thinking") ? { thinking: single.get("--thinking") } : {}),
      ...(extensions.length ? { extensionPaths: extensions } : {}),
      ...(single.has("--exclude-tools") ? { excludeTools: single.get("--exclude-tools")!.split(",") } : {}),
      ...(flags.length ? { extensionFlagValues: flags } : {}),
    });
    if (catalog) {
      if (prompt.length || owned.length || single.has("--session-dir")) throw new Error("--list-models cannot launch a session or accept a prompt");
      return { kind: "catalog", ...(search === undefined ? {} : { search }), runtimeOptions };
    }
    const startup = parseInteractiveLaunchArguments([...owned, ...(prompt.length ? ["--", ...prompt] : [])]);
    return { kind: "launch", intent: interactiveLaunchIntent("a1", startup.sessionSelection, { ...startup, runtimeOptions }) };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

function piCompatibleHelp(): string {
  return [
    "A1 Pi-compatible launch (normal A1 UI and profile; not Pi comparison)",
    "Usage: pi [options] [--] [instruction]",
    "  --model <pattern>       Real Pi catalog model, optionally provider/id:thinking",
    "  --provider <provider>   Restrict --model lookup",
    "  --thinking <level>      off|minimal|low|medium|high|xhigh|max; model-clamped",
    "  -e, --extension <path>  Explicit extension (repeatable)",
    "  --exclude-tools <list>  Comma-separated names/patterns",
    "  --session <path|id>     A1 writer-guarded session selection",
    "  --session-dir <dir>     Session storage/lookup override",
    "  --session-color <name>  Invocation-only A1 accent",
    "  --list-models [search]  Available catalog; no session or model request",
    "  --help                 This supported subset",
    "  --version              Truthful A1 and pinned Pi engine identity",
    "Prompt text is literal, NUL-free and at most 32768 UTF-8 bytes.",
    "Extension long flags require a loaded registration. Put -- before their literal prompt.",
    "Opt in by prepending the packaged bin/pi-compatible directory to the dedicated launch PATH.", "",
  ].join("\n");
}

export async function dispatchPiCompatibleCommand(
  command: PiCompatibleCommand,
  handlers: {
    readonly launch: (intent: InteractiveLaunchIntent) => Promise<number>;
    readonly version: () => Promise<number>;
    readonly catalog: (options: RuntimeLaunchOptions, search?: string) => Promise<number>;
  },
  output: CliOutput,
): Promise<number> {
  if (command.kind === "error") { output.stderr(`A1 Pi compatibility: ${command.message}\n`); return 2; }
  if (command.kind === "help") { output.stdout(piCompatibleHelp()); return 0; }
  if (command.kind === "version") return handlers.version();
  if (command.kind === "catalog") return handlers.catalog(command.runtimeOptions, command.search);
  if (command.kind === "launch") return handlers.launch(command.intent);
  return 2;
}
