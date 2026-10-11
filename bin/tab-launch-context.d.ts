export interface TabLaunchCredentials {
  readonly tabId: string;
  readonly token: string;
  readonly endpoint: string;
}

export function consumeTabLaunchContext(
  arguments_: readonly string[],
  environment: Record<string, string | undefined>,
): { readonly uiArguments: string[]; readonly tabCredentials: TabLaunchCredentials | undefined };
