export interface StableCandidateIdentity {
  schema: string;
  packageName: string;
  commandName: string;
  cliEntry: string;
  version: string;
  tag: string;
  commit: string;
  tree: string;
  registryPath: string;
}

export function deriveStableCandidate(input: {
  identity: { packageName: string; commandName: string; artifacts: { cliEntry: string } };
  packageName: string;
  version: string;
  tag: string;
  commit: string;
  actualCommit: string;
  tree: string;
  actualTree: string;
  status: string;
  registryStatus: "unpublished" | "published" | string;
}): StableCandidateIdentity;
export function observeStableRegistry(packageName: string, version: string, fetcher?: typeof fetch): Promise<"unpublished" | "published">;
