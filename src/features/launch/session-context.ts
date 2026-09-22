import {
  clearSessionRepositoryContext,
  setSessionRepositoryContext,
  type SessionRepositoryIdentity,
} from "../../foundation/lifecycle/index.js";

export type SessionContextRequest =
  | { readonly action: "link-worktree"; readonly path: string }
  | { readonly action: "unlink-worktree" };

export async function updateSessionRepositoryContext(
  identity: SessionRepositoryIdentity,
  request: SessionContextRequest,
): Promise<string | null> {
  if (request.action === "unlink-worktree") {
    await clearSessionRepositoryContext(identity);
    return null;
  }
  return (await setSessionRepositoryContext(identity, request.path)).cwd;
}
