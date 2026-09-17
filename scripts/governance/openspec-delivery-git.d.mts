export function readCanonicalSpecs(options: { cwd: string; sha: string; env?: NodeJS.ProcessEnv; gitImpl?: unknown }): Promise<Map<string, Buffer>>;
