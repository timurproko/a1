export interface TabLaunchCredentials {
  readonly tabId: string;
  readonly token: string;
  readonly endpoint: string;
}

export function formatResidentFallbackNotice(reason: string): string;

export function assignFreshSessionRuntimeId(
  environment: Record<string, string | undefined>,
  name: string,
  createId: () => string,
): string;

export function consumeTabLaunchContext(
  arguments_: readonly string[],
  environment: Record<string, string | undefined>,
): { readonly uiArguments: string[]; readonly tabCredentials: TabLaunchCredentials | undefined };
