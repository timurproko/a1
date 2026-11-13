import { validateRuntimeLaunchOptions, type RuntimeLaunchOptions } from "../../foundation/launch-context/index.js";
import { UI_ACCENT_COLORS, type UiAccentColor } from "../../contracts/owned-ui/index.js";
import { parseSessionSelection, type SessionSelection } from "../../foundation/lifecycle/session-selection.js";

export interface InteractiveLaunchArguments {
  readonly sessionSelection?: SessionSelection;
  readonly runtimeOptions?: RuntimeLaunchOptions;
  readonly sessionColor?: UiAccentColor;
  readonly promptArguments?: readonly string[];
}

/** Owned launch options only; the first boundary protects literal prompt text from parsing. */
export function parseInteractiveLaunchArguments(arguments_: readonly string[]): InteractiveLaunchArguments {
  const boundary = arguments_.indexOf("--");
  const options = boundary < 0 ? arguments_ : arguments_.slice(0, boundary);
  const selection: string[] = [];
  let sessionColor: UiAccentColor | undefined;
  let runtimeOptions: RuntimeLaunchOptions | undefined;
  for (let index = 0; index < options.length; index += 2) {
    const name = options[index], value = options[index + 1];
    if (name === "--runtime-options") {
      if (runtimeOptions !== undefined || value === undefined) throw new Error("--runtime-options requires one payload");
      runtimeOptions = validateRuntimeLaunchOptions(JSON.parse(value));
    } else if (name === "--session-color") {
      if (sessionColor !== undefined) throw new Error("--session-color may occur only once");
      if (!UI_ACCENT_COLORS.includes(value as UiAccentColor)) throw new Error("--session-color requires blue, green, orange, pink, purple, cyan, or grey");
      sessionColor = value as UiAccentColor;
    } else {
      if (name !== "--session" && name !== "--session-dir") throw new Error("expected --session, --session-dir, --session-color, or -- before literal prompt text");
      if (value === undefined) throw new Error(`${name} requires a value`);
      selection.push(name, value);
    }
  }
  const sessionSelection = parseSessionSelection(selection);
  const promptArguments = boundary < 0 ? undefined : Object.freeze(arguments_.slice(boundary + 1));
  if (promptArguments && (promptArguments.some(value => value.includes("\0")) || Buffer.byteLength(promptArguments.join(" "), "utf8") > 32_768)) {
    throw new Error("literal prompt must be NUL-free and at most 32768 bytes");
  }
  return Object.freeze({ ...(runtimeOptions ? { runtimeOptions } : {}), ...(sessionSelection ? { sessionSelection } : {}), ...(sessionColor ? { sessionColor } : {}), ...(promptArguments ? { promptArguments } : {}) });
}
