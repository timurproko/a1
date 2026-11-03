export const NPM_PUBLISH_ATTEMPTS: 2;
export const NPM_PUBLISH_RETRY_DELAY_MS: 5000;

export interface NpmPublishInvocation {
  readonly tarball: string;
  readonly channel: "latest" | "next";
}

export interface NpmPublishResult {
  readonly code: number;
  readonly signal?: string | null;
  readonly output: string;
}

export interface RegistryReconciliationResponse {
  readonly status: number;
  readonly ok: boolean;
  json(): Promise<unknown>;
}

export interface ExactPackagePublicationOptions {
  readonly tarball: string;
  readonly name: string;
  readonly version: string;
  readonly channel: "latest" | "next" | string;
  readonly integrity: string;
  readonly shasum: string;
  readonly publish?: (invocation: NpmPublishInvocation) => Promise<NpmPublishResult>;
  readonly fetch?: (url: string | URL, init?: RequestInit) => Promise<RegistryReconciliationResponse>;
  readonly sleep?: (durationMs: number) => Promise<void>;
  readonly report?: (message: string) => void;
  readonly now?: () => number;
  readonly attempts?: number;
  readonly retryDelayMs?: number;
}

export interface ExactPackagePublicationResult {
  readonly status: "published" | "existing";
  readonly attempts: number;
  readonly name: string;
  readonly version: string;
  readonly channel: "latest" | "next";
  readonly integrity: string;
  readonly shasum: string;
}

export function npmPublishArguments(tarball: string, channel: string): string[];
export function invokeNpmPublish(invocation: NpmPublishInvocation & {
  readonly environment?: NodeJS.ProcessEnv;
  readonly spawn?: typeof import("node:child_process").spawn;
  readonly stdout?: NodeJS.WriteStream;
  readonly stderr?: NodeJS.WriteStream;
}): Promise<NpmPublishResult>;
export function isDuplicateTransparencyLogFailure(output: unknown): boolean;
export function publishExactPackage(options: ExactPackagePublicationOptions): Promise<ExactPackagePublicationResult>;
