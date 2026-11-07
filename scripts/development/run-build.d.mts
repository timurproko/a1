export interface BuildStage { executable: string; arguments: readonly string[] }
export function buildStages(options: { npmCli: string; node?: string }): BuildStage[];
export function runBuild(options?: {
  environment?: NodeJS.ProcessEnv;
  spawn?: (...arguments_: any[]) => { status?: number | null; error?: Error };
}): number;
