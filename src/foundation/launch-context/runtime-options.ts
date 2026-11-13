export interface RuntimeLaunchOptions {
  readonly sessionDir?: string;
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
    if (key === "model" || key === "provider" || key === "sessionDir") {
      if (!text(field)) throw new Error(`Invalid runtime ${key}`);
    } else if (key === "thinking") {
      if (!["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(String(field))) throw new Error("Invalid thinking level");
    } else if (key === "extensionPaths" || key === "excludeTools") {
      if (!Array.isArray(field) || field.length > 128 || !field.every(text)) throw new Error(`Invalid runtime ${key}`);
    } else if (key === "extensionFlagValues") {
      if (!Array.isArray(field) || field.length > 128 || !field.every(pair => Array.isArray(pair) && pair.length === 2
        && typeof pair[0] === "string" && /^[a-z][a-z0-9-]*$/u.test(pair[0])
        && (typeof pair[1] === "boolean" || text(pair[1])))) throw new Error("Invalid extension flags");
    } else throw new Error(`Unknown runtime option: ${key}`);
  }
  if (object.provider !== undefined && object.model === undefined) throw new Error("--provider requires --model");
  return Object.freeze(JSON.parse(JSON.stringify(value))) as RuntimeLaunchOptions;
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.includes("\0");
}
