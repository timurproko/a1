export interface InteractiveStartupArguments {
  readonly sessionColor?: string;
  readonly promptArguments?: readonly string[];
}

/** Literal owned child argv; color policy belongs to launch, not release coordination. */
export function interactiveStartupArguments(options: InteractiveStartupArguments): string[] {
  const color = options.sessionColor;
  if (color !== undefined && !/^[a-z]{1,32}$/u.test(color)) throw new Error("Invalid invocation color payload");
  const prompt = options.promptArguments;
  if (prompt && (prompt.some(value => typeof value !== "string" || value.includes("\0")) || Buffer.byteLength(prompt.join(" "), "utf8") > 32_768)) {
    throw new Error("Invalid literal prompt payload");
  }
  return [...(color === undefined ? [] : ["--session-color", color]), ...(prompt === undefined ? [] : ["--", ...prompt])];
}
