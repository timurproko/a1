export interface BuildStage { executable: string; arguments: readonly string[] }
export function buildStages(options: { core: boolean; npmCli: string; node?: string }): BuildStage[];
export function runBuild(options?: {
  argv?: readonly string[];
  environment?: NodeJS.ProcessEnv;
  spawn?: (...arguments_: any[]) => { status?: number | null; error?: Error };
  resolveEnvironment?: (options: { environment: NodeJS.ProcessEnv }) => { environment: NodeJS.ProcessEnv };
}): number;
