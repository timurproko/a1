import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { archiveFailure, SHA } from "./openspec-archive-policy.mjs";

const execute = promisify(execFile);
const MAX_FILE = 8 * 1024 * 1024;

/** Read every canonical `openspec/specs/**` blob of one commit, keyed by repository path. */
export async function readCanonicalSpecs({ cwd, sha, env = process.env, gitImpl = execute }) {
  if (!SHA.test(sha ?? "")) throw archiveFailure("delivery-target-identity");
  const listing = await gitImpl("git", ["ls-tree", "-r", "-z", "--name-only", sha, "--", "openspec/specs"], { cwd, env, maxBuffer: MAX_FILE });
  const specs = new Map();
  for (const path of listing.stdout.split("\0").filter(Boolean)) {
    const blob = await gitImpl("git", ["show", `${sha}:${path}`], { cwd, env, encoding: "buffer", maxBuffer: MAX_FILE });
    specs.set(path, Buffer.from(blob.stdout));
  }
  return specs;
}
