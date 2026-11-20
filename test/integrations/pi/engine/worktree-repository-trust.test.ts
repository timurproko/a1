import { mkdtempSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectTrustStore } from "@earendil-works/pi-coding-agent";
import { createRepositoryTrustAnswer } from "../../../../src/integrations/pi/engine/repository-trust-answer.js";

let root: string;
let agentDir: string;
let repository: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "a1-repository-trust-"));
  agentDir = join(root, "agent");
  mkdirSync(agentDir, { recursive: true });
  mkdirSync(join(root, "repository"), { recursive: true });
  repository = realpathSync(join(root, "repository"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("repository trust for a declared worktree start command", () => {
  it("is false for a repository nobody decided about, without asking", async () => {
    await expect(createRepositoryTrustAnswer({ agentDir })(repository)).resolves.toBe(false);
  });

  it("follows the person's saved decision", async () => {
    new ProjectTrustStore(agentDir).setMany([{ path: repository, decision: true }]);
    await expect(createRepositoryTrustAnswer({ agentDir })(repository)).resolves.toBe(true);
    new ProjectTrustStore(agentDir).setMany([{ path: repository, decision: false }]);
    await expect(createRepositoryTrustAnswer({ agentDir })(repository)).resolves.toBe(false);
  });

  it("follows the decision this invocation was started with", async () => {
    await expect(createRepositoryTrustAnswer({ agentDir, runtimeOptions: { projectTrust: true } })(repository)).resolves.toBe(true);
    new ProjectTrustStore(agentDir).setMany([{ path: repository, decision: true }]);
    await expect(createRepositoryTrustAnswer({ agentDir, runtimeOptions: { projectTrust: false } })(repository)).resolves.toBe(false);
  });
});
