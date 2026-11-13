const INHERITED_HOST_KEYS = new Set([
  "FM_PI_SESSION_PID", "FM_PI_SESSION_START",
  "PI_SESSION_ID", "PI_SESSION_FILE", "PI_PROVIDER", "PI_MODEL", "PI_REASONING_LEVEL",
]);

/** Initialize one independent UI host, never an in-process session or child helper. */
export function initializeInteractiveProcessIdentity(
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): void {
  for (const key of Object.keys(environment)) {
    const name = platform === "win32" ? key.toUpperCase() : key;
    if (INHERITED_HOST_KEYS.has(name) || name === "AI_AGENT" || name === "PI_CODING_AGENT") delete environment[key];
  }
  environment.AI_AGENT = "pi";
  environment.PI_CODING_AGENT = "true";
}
