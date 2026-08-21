import { prerelease, valid } from "semver";

export function deriveStableCandidate(input) {
  if (!input?.identity?.packageName || !input.identity.commandName || !input.identity.artifacts?.cliEntry) throw new Error("stable product identity is incomplete");
  if (input.packageName !== input.identity.packageName) throw new Error("stable package differs from product identity");
  if (valid(input.version) === null || prerelease(input.version) !== null) throw new Error(`stable candidate requires a final SemVer version: ${input.version}`);
  const tag = `v${input.version}`;
  if (input.tag !== tag) throw new Error(`stable tag ${input.tag} does not match ${tag}`);
  validateGitIdentity(input.commit, "commit");
  validateGitIdentity(input.actualCommit, "actual commit");
  if (input.commit !== input.actualCommit) throw new Error("stable candidate commit differs from checked out source");
  validateGitIdentity(input.tree, "tree");
  validateGitIdentity(input.actualTree, "actual tree");
  if (input.tree !== input.actualTree) throw new Error("stable candidate tree differs from source tree");
  if (String(input.status ?? "").trim() !== "") throw new Error("stable candidate source is dirty");
  if (input.registryStatus !== "unpublished") throw new Error(`stable version is not available: ${input.registryStatus ?? "unknown"}`);
  return {
    schema: "a1-stable-candidate-identity-v1",
    packageName: input.identity.packageName,
    commandName: input.identity.commandName,
    cliEntry: input.identity.artifacts.cliEntry,
    version: input.version,
    tag,
    commit: input.commit,
    tree: input.tree,
    registryPath: encodeURIComponent(input.identity.packageName),
  };
}

export async function observeStableRegistry(packageName, version, fetcher = fetch) {
  const response = await fetcher(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${version}?preflight=${Date.now()}`, {
    headers: { accept: "application/json", "cache-control": "no-cache" },
  });
  if (response.status === 404) return "unpublished";
  if (!response.ok) throw new Error(`stable registry preflight returned HTTP ${response.status}`);
  return "published";
}

function validateGitIdentity(value, name) {
  if (typeof value !== "string" || !/^[a-f0-9]{40,64}$/.test(value)) throw new Error(`stable source ${name} is invalid`);
}
