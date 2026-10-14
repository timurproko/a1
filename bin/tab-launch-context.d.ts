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

export function waitForStandbyPromotion(input: NodeJS.ReadStream, promotionFile?: string): Promise<void>;

export function consumeTabLaunchContext(
  arguments_: readonly string[],
  environment: Record<string, string | undefined>,
): {
  readonly uiArguments: string[];
  readonly tabCredentials: TabLaunchCredentials | undefined;
  readonly tabDataDir?: string;
  readonly tabIncarnation?: number;
  readonly tabStandby: boolean;
};
