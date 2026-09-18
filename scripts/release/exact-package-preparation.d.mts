export interface ExactPackageLaneIdentity {
  platform: "win32" | "linux" | "darwin";
  architecture: "x64" | "arm64";
  nodeVersion: string;
  runId: string;
  runAttempt: string;
}

export interface ExactPackagePreparationReceipt {
  schema: "a1-exact-package-preparation-v1";
  authority: "validation-runner";
  candidate: { sha256: string; size: number; name: string; version: string };
  lane: ExactPackageLaneIdentity;
  install: {
    policy: string;
    root: string;
    prefix: string;
    packageRoot: string;
    installedIdentity: { name: string; version: string; files: number; bytes: number; sha256: string };
  };
  preparation: {
    count: 1;
    durationMs: number;
    phases: { installMs: number; installedIdentityMs: number };
  };
  consumers: Array<"package-contracts" | "package-startup">;
  receiptId: string;
}

export interface ExactPackagePreparation {
  root: string;
  prefix: string;
  packageRoot: string;
  receiptPath: string;
  receipt: ExactPackagePreparationReceipt;
  durationMs: number;
}

export const EXACT_PACKAGE_PREPARATION_SCHEMA: "a1-exact-package-preparation-v1";
export const EXACT_PACKAGE_INSTALL_POLICY: "npm-global-ignore-scripts-prefer-offline-v1";
export const EXACT_PACKAGE_PREPARATION_ENV: Readonly<Record<"mode" | "root" | "prefix" | "receipt" | "consumers" | "consumer", string>>;

export function prepareExactPackageInstallation(options: {
  candidatePath?: string;
  consumers: string[];
  environment?: NodeJS.ProcessEnv;
  rootParent?: string;
  identity?: Partial<ExactPackageLaneIdentity>;
  now?: () => number;
  runCommand?: (command: string, arguments_: string[], cwd: string, environment: NodeJS.ProcessEnv) => Promise<{ status: number | null; stdout: string; stderr: string }>;
  removeRoot?: (root: string) => Promise<"passed" | "deferred">;
}): Promise<ExactPackagePreparation>;

export function verifyExactPackagePreparation(options?: {
  candidatePath?: string;
  consumer?: string;
  environment?: NodeJS.ProcessEnv;
  identity?: Partial<ExactPackageLaneIdentity>;
}): Promise<ExactPackagePreparation>;

export function exactPackagePreparationEnvironment(preparation: ExactPackagePreparation): NodeJS.ProcessEnv;
export function cleanupExactPackagePreparation(preparation: Pick<ExactPackagePreparation, "root">, options?: {
  now?: () => number;
  removeRoot?: (root: string) => Promise<"passed" | "deferred">;
}): Promise<{ status: "passed" | "deferred" | "failed"; error: string | null; durationMs: number }>;
export function installArguments(prefix: string, candidatePath: string): string[];
