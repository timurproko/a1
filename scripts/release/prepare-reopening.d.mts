export interface ReopeningResult {
  readonly url: string;
  readonly number: number;
  readonly branch: string;
  readonly head: string;
  readonly opening: string;
  readonly reused: boolean;
}
export function prepareReopening(options?: {
  releaseVersion?: string;
  source?: string;
  digest?: string;
  noteFile?: string;
  cwd?: string;
  run?: (executable: string, args: readonly string[]) => string;
}): Promise<ReopeningResult>;
