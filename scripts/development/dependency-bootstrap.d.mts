import type { NpmExecutor } from "./dependency-process.mjs";
export interface DependencyManifest {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}
export interface PublicationDependencyOptions {
  readonly root?: string | URL;
  readonly signal?: AbortSignal;
  readonly log?: (message: string) => void;
  readonly npm?: NpmExecutor;
  readonly inspect?: (root: string, manifest: DependencyManifest, npm: NpmExecutor, signal?: AbortSignal) => Promise<string | null>;
  readonly lockWaitMs?: number;
}
export function ensurePublicationDependencies(options?: PublicationDependencyOptions): Promise<void>;
