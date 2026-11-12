import { UI_ACCENT_COLORS, type UiAccentColor } from "../contracts/owned-ui/index.js";
import { requestSessionControl, resolveProductPaths } from "../foundation/lifecycle/index.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../product-identity.js";

interface ColorCommandOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly stdout?: (message: string) => void;
}
const failure = (code: string, message: string) => Object.assign(new Error(message), { code });

export async function runSessionColorCommand(arguments_: readonly string[], options: ColorCommandOptions = {}): Promise<number> {
  const stdout = options.stdout ?? (message => process.stdout.write(message));
  const environment = options.environment ?? process.env;
  try {
    const [action, ...rest] = arguments_;
    if (action === "help" || action === "--help" || action === "-h") {
      stdout(`${PRODUCT_TEXT.commandName} session color capabilities | list | get [--session <id>] | set <color> [--session <id>]\nAlways JSON; get/set target Current color only. Outside an A1 shell, --session is required.\nCapabilities returns version 1 with launchColor and terminalIdentity booleans without starting a session or probing Core.\nStartup --session-color is invocation-only; live writes change neither saved Default nor replacement policy.\n`);
      return 0;
    }
    if (action === "capabilities" && rest.length === 0) { stdout(`${JSON.stringify({ version: 1, launchColor: true, terminalIdentity: true })}\n`); return 0; }
    if (action === "list" && rest.length === 0) { stdout(`${JSON.stringify({ colors: UI_ACCENT_COLORS })}\n`); return 0; }
    if (action !== "get" && action !== "set") throw failure("invalid-request", "Use session color capabilities, list, get, or set <color>.");
    const color = action === "set" ? rest.shift() : undefined;
    if (action === "set" && !UI_ACCENT_COLORS.includes(color as UiAccentColor)) throw failure("invalid-color", "Choose blue, green, orange, pink, purple, cyan, or grey.");
    if (rest.length !== 0 && (rest.length !== 2 || rest[0] !== "--session" || !rest[1])) throw failure("invalid-request", "Expected only --session followed by a complete session id.");
    const explicit = rest.length === 2;
    const runtimeId = environment[PRODUCT_IDENTITY.environment.sessionRuntimeId];
    const sessionId = explicit ? rest[1] : runtimeId && environment.PI_SESSION_FILE ? environment.PI_SESSION_ID : undefined;
    if (!sessionId) throw failure("session-required", "Supply --session <id> outside an exact A1 shell runtime.");
    const result = await requestSessionControl({
      runtimeDir: resolveProductPaths(environment).runtimeDir, sessionId,
      ...(!explicit && runtimeId ? { runtimeId } : {}),
      payload: { action, ...(color === undefined ? {} : { color }) },
    });
    stdout(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    const detail = error as Error & { code?: string };
    const code = detail.code ?? "control-failed";
    stdout(`${JSON.stringify({ error: { code, message: detail.message } })}\n`);
    return ["invalid-request", "invalid-color", "invalid-session", "session-required"].includes(code) ? 2 : 1;
  }
}
