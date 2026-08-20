import { fileURLToPath } from "node:url";
import type { LaunchProfileId } from "../foundation/lifecycle/index.js";
import { runTransparentForeground } from "../foundation/transparent-terminal/index.js";

export function selectTransparentChild(
  environment: NodeJS.ProcessEnv = process.env,
  executable = process.execPath,
  compositionUrl = import.meta.url,
): { readonly executable: string; readonly arguments: readonly string[] } {
  const entry = fileURLToPath(new URL("../foundation/pi-engine-adapter/public-main-entry.js", compositionUrl));
  return { executable, arguments: [entry, ...parseSelectedArguments(environment.A1_LAUNCH_ARGUMENTS_JSON)] };
}

export async function runSelectedTransparentRuntime(
  profileId: Exclude<LaunchProfileId, "a1">,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const child = selectTransparentChild(environment);
  return await runTransparentForeground({ profileId, environment, ...child });
}

function parseSelectedArguments(source: string | undefined): readonly string[] {
  if (!source) return [];
  const value: unknown = JSON.parse(source);
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new TypeError("A1_LAUNCH_ARGUMENTS_JSON must be a JSON array of strings");
  }
  return value;
}
