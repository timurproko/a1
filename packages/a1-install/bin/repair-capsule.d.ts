export function inspectRepairWriters(prefix: string, recoveryEntry: string, execute?: (file: string, args: string[], options: Record<string, unknown>) => Promise<{ stdout: string }>): Promise<boolean>;
export function validateRepairCapsule(manifestPath: string, options: {
  globalRoot: string; packageName: string; targetVersion: string; platform?: NodeJS.Platform;
  inspect?: (prefix: string, recoveryEntry: string) => Promise<boolean>; knownDigest?: string;
}): Promise<{ packageRoot: string; dataDir: string; prefix: string }>;
