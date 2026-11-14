import { resolve } from "node:path";
import { homedir } from "node:os";
import { parseInteractiveLaunchArguments, type InteractiveLaunchArguments } from "../features/launch/index.js";
import { validateRuntimeLaunchOptions, type RuntimeLaunchOptions } from "../foundation/launch-context/index.js";

export type InteractiveCommand =
  | ({ readonly kind: "launch"; readonly profileId: "a1" } & InteractiveLaunchArguments)
  | { readonly kind: "catalog"; readonly search?: string; readonly runtimeOptions: RuntimeLaunchOptions }
  | { readonly kind: "error"; readonly message: string };

const VALUE_OPTIONS = new Map([
  ["--model", "--model"], ["--provider", "--provider"], ["--thinking", "--thinking"],
  ["-e", "--extension"], ["--extension", "--extension"],
  ["-xt", "--exclude-tools"], ["--exclude-tools", "--exclude-tools"],
  ["--session", "--session"], ["--session-dir", "--session-dir"], ["--session-color", "--session-color"],
  ["--session-id", "--session-id"], ["--fork", "--fork"], ["--name", "--name"], ["-n", "--name"],
  ["--api-key", "--api-key"], ["--models", "--models"],
]);
const SWITCH_OPTIONS = new Map([
  ["--continue", "--continue"], ["-c", "--continue"], ["--resume", "--resume"], ["-r", "--resume"],
  ["--no-session", "--no-session"], ["--approve", "--approval"], ["-a", "--approval"],
  ["--no-approve", "--approval"], ["-na", "--approval"],
]);
// Reserved public Pi contracts must never masquerade as extension flags or prompt text during rollout.
const PENDING_OPTIONS = new Set([
  "--mode", "--print", "-p", "--export",
  "--tools", "-t", "--no-tools", "-nt", "--no-builtin-tools", "-nbt", "--no-extensions", "-ne", "--no-mcp",
  "--skill", "--no-skills", "-ns", "--prompt-template", "--no-prompt-templates", "-np", "--theme", "--use-theme",
  "--no-themes", "--no-context-files", "-nc", "--system-prompt", "--append-system-prompt", "--tui-mode", "--verbose", "--offline",
]);

/** Delivered flags only: the naming entries share descriptions, not a second feature set. */
export function interactiveOptionHelp(): readonly string[] {
  return [
    "  --model <pattern>       Catalog model, optionally provider/id:thinking",
    "  --provider <provider>   Restrict --model lookup (requires --model)",
    "  --thinking <level>      off|minimal|low|medium|high|xhigh|max; model-clamped",
    "  -e, --extension <path>  Explicit extension or package source (repeatable)",
    "  -xt, --exclude-tools <list>  Comma-separated tool names/patterns",
    "  --session <path|id>     Writer-guarded session selection",
    "  -c, --continue         Continue the most recent project session",
    "  -r, --resume           Choose a session interactively",
    "  --fork <path|id>        Copy into a new session in the current project",
    "  --session-id <id>      Resume exact local ID or create it",
    "  -n, --name <name>      Set the session display name",
    "  --no-session          Real in-memory session; no session file/writer",
    "  --models <patterns>   Comma-separated invocation model scope",
    "  --api-key <key>       Process-only key for the selected provider",
    "  -a, --approve         Trust project resources for this invocation",
    "  -na, --no-approve     Withhold project resources for this invocation",
    "  --session-dir <dir>     Session storage/lookup override",
    "  --session-color <name>  Invocation-only A1 accent",
    "  --list-models [search]  Effective-profile catalog; no session/model call",
    "Instructions are positional; -- ends options and makes command words literal.",
    "Extension long flags require loaded registrations; use -- before their prompts.",
    "Default Pi parity is being delivered in stages; machine/input/resource contracts not yet delivered fail explicitly.",
    "Current argv input is NUL-free and bounded to 32768 UTF-8 bytes; larger input transport is pending.",
  ];
}

/** Public grammar only. Internal selected-release payloads are never accepted here. */
export function parseInteractiveCommand(arguments_: readonly string[], cwd = process.cwd()): InteractiveCommand {
  try {
    const owned: string[] = [], prompts: string[] = [], extensions: string[] = [], flags: [string, string | boolean][] = [];
    const single = new Map<string, string>();
    let catalog = false, search: string | undefined, literal = false;
    for (let index = 0; index < arguments_.length; index++) {
      const token = arguments_[index]!;
      if (!literal && token === "--") { literal = true; continue; }
      if (token.startsWith("@")) throw new Error("File/image inputs are not available yet; the shared input transport is pending.");
      if (literal || !token.startsWith("-")) { prompts.push(token); continue; }
      const name = token.split("=", 1)[0]!;
      if (name === "--runtime-options" || ["--help", "-h", "--version", "-v"].includes(name)) throw new Error(`Unsupported option in this invocation: ${name}`);
      if (PENDING_OPTIONS.has(name)) throw new Error(`${name} is not available yet in this partial delivery of default Pi compatibility.`);
      if (token === "--list-models") {
        if (catalog) throw new Error("--list-models may occur only once");
        catalog = true;
        const next = arguments_[index + 1];
        if (next !== undefined && !next.startsWith("-") && !next.startsWith("@")) search = arguments_[++index];
        continue;
      }
      if (name !== token && (VALUE_OPTIONS.has(name) || name === "--list-models")) throw new Error(`${name} requires a separate value`);
      const toggle = SWITCH_OPTIONS.get(token);
      if (toggle !== undefined) {
        if (single.has(toggle)) throw new Error(`${toggle} may occur only once`);
        single.set(toggle, token === "--no-approve" || token === "-na" ? "false" : "true");
        continue;
      }
      if (SWITCH_OPTIONS.has(name)) throw new Error(`${name} does not accept a value`);
      const canonical = VALUE_OPTIONS.get(token);
      if (canonical !== undefined) {
        const value = arguments_[++index];
        if (value === undefined || value.length === 0 || value.startsWith("-") || value.includes("\0")) throw new Error(`${token} requires a value`);
        if (canonical === "--extension") { extensions.push(extensionSource(value, cwd)); continue; }
        if (single.has(canonical)) throw new Error(`${canonical} may occur only once`);
        single.set(canonical, value);
        if (canonical === "--session" || canonical === "--session-color") owned.push(canonical, value);
        continue;
      }
      const match = /^--([a-z][a-z0-9-]*)(?:=(.*))?$/u.exec(token);
      if (!match) throw new Error(`Unsupported option: ${token}`);
      const next = arguments_[index + 1];
      flags.push([match[1]!, match[2] ?? (next !== undefined && !next.startsWith("-") && !next.startsWith("@") ? arguments_[++index]! : true)]);
    }
    if (single.has("--session") && single.has("--session-dir")) owned.push("--session-dir", single.get("--session-dir")!);
    const runtimeOptions = validateRuntimeLaunchOptions({
      ...(single.has("--session-dir") && !single.has("--session") ? { sessionDir: resolve(cwd, single.get("--session-dir")!) } : {}),
      ...(single.has("--continue") ? { continueSession: true } : {}),
      ...(single.has("--resume") ? { resumeSession: true } : {}),
      ...(single.has("--no-session") ? { noSession: true } : {}),
      ...(single.has("--fork") ? { forkSession: sessionTarget(single.get("--fork")!, cwd) } : {}),
      ...(single.has("--session-id") ? { sessionId: single.get("--session-id") } : {}),
      ...(single.has("--name") ? { sessionName: single.get("--name") } : {}),
      ...(single.has("--models") ? { modelPatterns: single.get("--models")!.split(",").map(value => value.trim()) } : {}),
      ...(single.has("--api-key") ? { apiKey: single.get("--api-key") } : {}),
      ...(single.has("--approval") ? { projectTrust: single.get("--approval") === "true" } : {}),
      ...(single.has("--model") ? { model: single.get("--model") } : {}),
      ...(single.has("--provider") ? { provider: single.get("--provider") } : {}),
      ...(single.has("--thinking") ? { thinking: single.get("--thinking") } : {}),
      ...(extensions.length ? { extensionPaths: extensions } : {}),
      ...(single.has("--exclude-tools") ? { excludeTools: single.get("--exclude-tools")!.split(",").map(value => value.trim()) } : {}),
      ...(flags.length ? { extensionFlagValues: flags } : {}),
      ...(prompts.length > 1 ? { promptSequence: true } : {}),
    });
    if (single.has("--session") && (runtimeOptions.forkSession || runtimeOptions.sessionId)) throw new Error("--session cannot be combined with --fork or --session-id");
    if (catalog) {
      if (runtimeOptions.apiKey) throw new Error("--api-key requires a session invocation");
      if (prompts.length || owned.length || ["--session-dir", "--continue", "--resume", "--no-session", "--fork", "--session-id", "--name"].some(name => single.has(name))) throw new Error("--list-models cannot launch a session or accept a prompt");
      return { kind: "catalog", ...(search === undefined ? {} : { search }), runtimeOptions };
    }
    const startup = parseInteractiveLaunchArguments([...owned, ...(prompts.length || literal ? ["--", ...prompts] : [])]);
    return { kind: "launch", profileId: "a1", ...startup, ...(Object.keys(runtimeOptions).length ? { runtimeOptions } : {}) };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/** Diagnostic views must not retain either public or structured invocation credentials. */
export function redactInteractiveArguments(arguments_: readonly string[]): readonly string[] {
  const result: string[] = [];
  for (let index = 0; index < arguments_.length; index++) {
    const token = arguments_[index]!;
    if (token === "--") { result.push(...arguments_.slice(index)); break; }
    if (token.startsWith("--api-key=")) { result.push("--api-key=[redacted]"); continue; }
    result.push(token);
    if (token === "--api-key" && arguments_[index + 1] !== undefined) { result.push("[redacted]"); index++; }
    if (token === "--runtime-options" && arguments_[index + 1] !== undefined) {
      try {
        const options = validateRuntimeLaunchOptions(JSON.parse(arguments_[++index]!));
        result.push(JSON.stringify({ ...options, ...(options.apiKey === undefined ? {} : { apiKey: "[redacted]" }) }));
      } catch { result.push("[invalid runtime options omitted]"); }
    }
  }
  return result;
}

function sessionTarget(value: string, cwd: string): string {
  return value.includes("/") || value.includes("\\") || value.endsWith(".jsonl") ? resolve(cwd, value.startsWith("~/") || value.startsWith("~\\") ? resolve(homedir(), value.slice(2)) : value) : value;
}

function extensionSource(value: string, cwd: string): string {
  if (/^(?:builtin:|npm:|git:|https?:|ssh:|git@)/u.test(value)) return value;
  return resolve(cwd, value.startsWith("~/") || value.startsWith("~\\") ? resolve(homedir(), value.slice(2)) : value);
}
