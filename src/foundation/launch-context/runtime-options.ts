export interface RuntimeLaunchOptions {
  readonly sessionDir?: string;
  readonly continueSession?: true;
  readonly resumeSession?: true;
  readonly forkSession?: string;
  readonly sessionId?: string;
  readonly sessionName?: string;
  readonly noSession?: true;
  readonly projectTrust?: boolean;
  readonly modelPatterns?: readonly string[];
  /** Process-only credential. Never copy into environment, settings or diagnostic evidence. */
  readonly apiKey?: string;
  /** Ordered public CLI messages; legacy internal prompt argv remains joined. */
  readonly promptSequence?: boolean;
  readonly model?: string;
  readonly provider?: string;
  readonly thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  readonly extensionPaths?: readonly string[];
  readonly excludeTools?: readonly string[];
  readonly extensionFlagValues?: readonly (readonly [string, string | boolean])[];
}

/** Bounded structured invocation payload; never an environment variable or shell fragment. */
export function validateRuntimeLaunchOptions(value: unknown): RuntimeLaunchOptions {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid runtime options");
  const object = value as Record<string, unknown>;
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 32_768) throw new Error("Runtime options exceed 32768 bytes");
  for (const [key, field] of Object.entries(object)) {
    if (["model", "provider", "sessionDir", "forkSession", "sessionName", "apiKey"].includes(key)) {
      if (!text(field) || (key === "sessionName" && field.trim().length === 0)) throw new Error(`Invalid runtime ${key}`);
    } else if (key === "sessionId") {
      if (typeof field !== "string" || !/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/u.test(field)) throw new Error("Invalid session ID");
    } else if (["promptSequence", "continueSession", "resumeSession", "noSession"].includes(key)) {
      if (field !== true) throw new Error(`Invalid runtime ${key}`);
    } else if (key === "projectTrust") {
      if (typeof field !== "boolean") throw new Error("Invalid project trust override");
    } else if (key === "thinking") {
      if (!["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(String(field))) throw new Error("Invalid thinking level");
    } else if (key === "extensionPaths" || key === "excludeTools" || key === "modelPatterns") {
      if (!Array.isArray(field) || field.length > 128 || !field.every(text)) throw new Error(`Invalid runtime ${key}`);
    } else if (key === "extensionFlagValues") {
      if (!Array.isArray(field) || field.length > 128 || !field.every(pair => Array.isArray(pair) && pair.length === 2
        && typeof pair[0] === "string" && /^[a-z][a-z0-9-]*$/u.test(pair[0])
        && (typeof pair[1] === "boolean" || text(pair[1])))) throw new Error("Invalid extension flags");
    } else throw new Error(`Unknown runtime option: ${key}`);
  }
  if (object.provider !== undefined && object.model === undefined) throw new Error("--provider requires --model");
  if (object.forkSession !== undefined && (object.continueSession || object.resumeSession || object.noSession)) throw new Error("--fork cannot be combined with --continue, --resume or --no-session");
  if (object.sessionId !== undefined && (object.continueSession || object.resumeSession)) throw new Error("--session-id cannot be combined with --continue or --resume");
  if (object.apiKey !== undefined && object.model === undefined && !object.modelPatterns) throw new Error("--api-key requires --model or --models to choose its provider");
  return Object.freeze({ ...JSON.parse(JSON.stringify(value)), ...(typeof object.sessionName === "string" ? { sessionName: object.sessionName.trim() } : {}) }) as RuntimeLaunchOptions;
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.includes("\0");
}
