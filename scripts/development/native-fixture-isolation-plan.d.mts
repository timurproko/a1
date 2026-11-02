export interface IsolationPlan {
  id: string;
  platform: string;
  head: string;
  runId: string;
  runAttempt: string;
  repo: string;
  workspace?: string;
  node: string;
  home: string;
  temp: string;
  work: string;
  control: string;
  cargo: string;
  rustup: string;
  receipt: string;
  runnerHome: string;
  toolCache?: string;
  zig?: string;
}
export interface IsolationProbe {
  loopback: boolean;
  remoteBlocked: boolean;
  credentialsHidden: boolean;
  unprivileged: boolean;
  sourceImmutable: boolean;
}
export function assertHostedFixtureJob(
  environment: Record<string, string | undefined>,
): void;
export function fixtureEnvironment(
  environment: Record<string, string | undefined>,
  state: IsolationPlan,
): Record<string, string>;
export function isolationReceipt(
  state: IsolationPlan,
  probe: IsolationProbe,
  defenderRealtime?: boolean,
): Record<string, unknown>;
export function writableOutputs(repo: string): string[];
export function macSandboxProfile(state: IsolationPlan): string;
export function linuxSandboxArguments(
  state: IsolationPlan,
  command: string[],
): string[];
