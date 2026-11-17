/** Bounded observer evidence with credential values and unsafe diagnostic URLs removed. */
export function collectPublishedPairDiagnostics(directory: string, environment?: NodeJS.ProcessEnv): Promise<Record<string, string>>;
export function diagnosePublishedPair(environment?: NodeJS.ProcessEnv): Promise<void>;
