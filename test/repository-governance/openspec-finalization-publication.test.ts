import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";
import { parseConditionalAcceptance } from "../../scripts/governance/openspec-delivery-policy.mjs";
import { classifyFinalizationCandidate, reconcileFinalization } from "../../scripts/governance/openspec-finalization-publication.mjs";

const execute = promisify(execFile);
const roots: string[] = [];
const toolRoot = resolve("node_modules/@fission-ai/openspec");
const requirement = (name: string, text: string) => `### Requirement: ${name}\nThe system SHALL ${text}.\n\n#### Scenario: ${name}\n- **WHEN** ${name.toLowerCase()} is evaluated\n- **THEN** it SHALL ${text}\n`;
const spec = (body: string) => `# example Specification\n\n## Purpose\n\nDefine an example capability with enough detail for finalization tests.\n\n## Requirements\n\n${body}`;
const proposal = `## Why\n\nImprove example behavior.\n\n## What Changes\n\n- Improve it.\n\n## Capabilities\n\n### New Capabilities\n\nNone.\n\n### Modified Capabilities\n\n- \`example\`: Improve behavior.\n\n## Impact\n\nFixture only.\n`;
const body = (metadata: unknown = { version: 3, change: "example" }) => `## Proposal\n\nDeliver the example behavior.\n\n## Implementation\n\n- Implement it.\n\n## Acceptance\n\n- Using the example preserves the updated observable behavior.\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n${JSON.stringify(metadata, null, 2)}\n\`\`\`\n\n</details>\n`;

async function git(cwd: string, args: string[]) {
  return (await execute("git", args, { cwd, timeout: 30_000, env: { ...process.env, GIT_CONFIG_GLOBAL: join(cwd, "..", "no-config"), GIT_CONFIG_NOSYSTEM: "1" } })).stdout.trim();
}

async function write(cwd: string, files: Record<string, string | null>) {
  for (const [path, value] of Object.entries(files)) {
    if (value === null) await rm(join(cwd, path), { force: true });
    else { await mkdir(join(cwd, path, ".."), { recursive: true }); await writeFile(join(cwd, path), value); }
  }
}

async function commit(cwd: string, message: string, files: Record<string, string | null> = {}) {
  await write(cwd, files);
  await git(cwd, ["add", "-A"]);
  await git(cwd, ["-c", "user.name=Developer", "-c", "user.email=dev@example.test", "commit", "--quiet", "--allow-empty", "-m", message]);
  return await git(cwd, ["rev-parse", "HEAD"]);
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-finalization-publication-"));
  roots.push(root);
  const remote = join(root, "remote.git"), seed = join(root, "seed");
  await mkdir(seed);
  await git(root, ["init", "--quiet", "--bare", remote]);
  await git(seed, ["init", "--quiet", "-b", "develop"]);
  await commit(seed, "Fixture base", {
    "openspec/config.yaml": "schema: spec-driven\n",
    "openspec/changes/archive/.gitkeep": "",
    "openspec/specs/example/spec.md": spec(requirement("Example behavior", "preserve existing behavior")),
    "src/app.txt": "base\n",
  });
  await git(seed, ["remote", "add", "origin", remote]);
  await git(seed, ["push", "--quiet", "origin", "develop"]);
  await git(seed, ["checkout", "--quiet", "-b", "feature/example"]);
  await commit(seed, "feat: example", {
    "openspec/changes/example/.openspec.yaml": "schema: spec-driven\ncreated: 2026-09-15\n",
    "openspec/changes/example/proposal.md": proposal,
    "openspec/changes/example/design.md": "## Context\n\nFixture design.\n",
    "openspec/changes/example/tasks.md": "## 1. Work\n\n- [x] 1.1 Implement and verify example behavior.\n",
    "openspec/changes/example/specs/example/spec.md": `## MODIFIED Requirements\n\n${requirement("Example behavior", "preserve updated behavior")}`,
    "openspec/changes/example/implementation-evidence.md": "# Evidence\n\nFocused fixture passed.\n",
    "src/app.txt": "feature\n",
  });
  await git(seed, ["push", "--quiet", "origin", "feature/example"]);
  const state = { body: body(), draft: false, state: "open", bodyReads: [] as string[] };
  const mutations: { path: string; method: string; body: { body: string } }[] = [];
  const reader = { repository: "owner/repo", prefix: "/repos/owner/repo",
    async get(path: string) {
      if (path.endsWith("/git/ref/heads/develop")) return { object: { sha: await git(root, ["--git-dir", remote, "rev-parse", "refs/heads/develop"]) } };
      if (path.endsWith("/pulls/7")) {
        state.bodyReads.push(state.body);
        return { number: 7, state: state.state, draft: state.draft, body: state.body,
          base: { ref: "develop", repo: { full_name: "owner/repo" } },
          head: { ref: "feature/example", sha: await git(root, ["--git-dir", remote, "rev-parse", "refs/heads/feature/example"]), repo: { full_name: "owner/repo" } } };
      }
      throw new Error(`unexpected read ${path}`);
    } };
  const publisher = { repository: "owner/repo", actor: "archive-app[bot]", actorEmail: "1+archive-app[bot]@users.noreply.github.com", token: null,
    async mutate(path: string, method: string, value: { body: string }) { mutations.push({ path, method, body: value }); state.body = value.body; return { number: 7 }; } };
  const remoteHead = () => git(root, ["--git-dir", remote, "rev-parse", "refs/heads/feature/example"]);
  const remoteFile = async (path: string, ref: string | undefined = "refs/heads/feature/example") => await git(root, ["--git-dir", remote, "show", `${ref}:${path}`]);
  const reconcile = (overrides: Record<string, unknown> = {}) => reconcileFinalization({ reader, publisher, number: 7, toolRoot, remoteUrl: remote, date: "2026-09-16", ...overrides });
  return { root, remote, seed, state, mutations, reader, publisher, remoteHead, remoteFile, reconcile };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("trusted finalization publication", () => {
  it("finalizes an active ready head, updates the body afterwards, and is a no-op on its own output", async () => {
    const f = await fixture();
    const before = await f.remoteHead();
    const result = await f.reconcile();
    expect(result.disposition).toBe("finalized");
    expect(result.commits.map(commit => commit.kind)).toEqual(["finalize"]);
    expect(result.head).toBe(before);
    expect(await f.remoteHead()).toBe(result.pushedHead);
    expect(await git(f.root, ["--git-dir", f.remote, "log", "-1", "--format=%an <%ae> %s", result.pushedHead!]))
      .toBe("archive-app[bot] <1+archive-app[bot]@users.noreply.github.com> docs(openspec): finalize example");
    const archive = "openspec/changes/archive/2026-09-16-example/";
    expect((await git(f.root, ["--git-dir", f.remote, "diff", "--name-only", before, result.pushedHead!])).split("\n").every(path => path.startsWith("openspec/"))).toBe(true);
    expect(await f.remoteFile("openspec/specs/example/spec.md")).toContain("preserve updated behavior");
    expect(f.mutations).toHaveLength(1);
    expect(parseImplementation(f.mutations[0]!.body.body)).toMatchObject({ archive, acceptanceManifest: `${archive}acceptance.md` });
    expect(parseConditionalAcceptance(await f.remoteFile(`${archive}acceptance.md`)).sourcePr).toBe(7);

    const repeated = await f.reconcile();
    expect(repeated).toMatchObject({ disposition: "already-finalized", commits: [], bodyUpdated: false });
    expect(await f.remoteHead()).toBe(result.pushedHead);
    expect(f.mutations).toHaveLength(1);
  }, 90_000);

  it("re-finalizes in place after a developer edits the archived tasks", async () => {
    const f = await fixture();
    const first = await f.reconcile();
    await git(f.seed, ["pull", "--quiet", "origin", "feature/example"]);
    const archive = "openspec/changes/archive/2026-09-16-example/";
    const tasks = `${await readFile(join(f.seed, archive, "tasks.md"), "utf8")}- [x] 1.2 Repair the example after validation.\n`;
    await commit(f.seed, "fix: repair example", { [`${archive}tasks.md`]: tasks, "src/app.txt": "repaired\n" });
    await git(f.seed, ["push", "--quiet", "origin", "feature/example"]);
    const result = await f.reconcile();
    expect(result.disposition).toBe("refinalized");
    expect(result.commits.map(commit => commit.kind)).toEqual(["refinalize"]);
    expect(result.bodyUpdated).toBe(false);
    expect(result.archive).toBe(archive);
    expect(await f.remoteFile(`${archive}tasks.md`)).toContain("1.2");
    expect(parseConditionalAcceptance(await f.remoteFile(`${archive}acceptance.md`)).tasksDigest)
      .not.toBe(parseConditionalAcceptance(await f.remoteFile(`${archive}acceptance.md`, first.pushedHead)).tasksDigest);
    expect(await f.remoteFile("src/app.txt")).toBe("repaired");
  }, 90_000);

  it("restores, merges develop, and re-finalizes a finalized head that fell behind", async () => {
    const f = await fixture();
    await f.reconcile();
    await git(f.seed, ["checkout", "--quiet", "develop"]);
    const advanced = await commit(f.seed, "docs: other requirement", {
      "openspec/specs/example/spec.md": spec(`${requirement("Example behavior", "preserve existing behavior")}\n${requirement("Other behavior", "keep the other behavior")}`),
      "src/other.txt": "other\n",
    });
    await git(f.seed, ["push", "--quiet", "origin", "develop"]);
    const result = await f.reconcile();
    expect(result.disposition).toBe("refinalized");
    expect(result.commits.map(commit => commit.kind)).toEqual(["restore", "merge", "refinalize"]);
    const archive = "openspec/changes/archive/2026-09-16-example/";
    const synchronized = await f.remoteFile("openspec/specs/example/spec.md");
    expect(synchronized).toContain("preserve updated behavior");
    expect(synchronized).toContain("Other behavior");
    expect(parseConditionalAcceptance(await f.remoteFile(`${archive}acceptance.md`)).specBaseSha).toBe(advanced);
    expect(await f.remoteFile("src/other.txt")).toBe("other");
    expect(await git(f.root, ["--git-dir", f.remote, "rev-list", "--parents", "-n", "1", result.commits[1]!.sha])).toContain(advanced);
    expect(await f.reconcile()).toMatchObject({ disposition: "already-finalized" });
  }, 120_000);

  it("stops on a merge conflict outside OpenSpec without pushing", async () => {
    const f = await fixture();
    await git(f.seed, ["checkout", "--quiet", "develop"]);
    await commit(f.seed, "feat: conflicting", { "src/app.txt": "develop\n" });
    await git(f.seed, ["push", "--quiet", "origin", "develop"]);
    const before = await f.remoteHead();
    await expect(f.reconcile()).rejects.toThrow("finalization-merge-conflict");
    expect(await f.remoteHead()).toBe(before);
    expect(f.mutations).toHaveLength(0);
  }, 90_000);

  it("pushes nothing when the head moves before the leased push and leaves the body for the next event", async () => {
    const f = await fixture();
    const before = await f.remoteHead();
    let raced = false;
    const gitImpl = async (command: string, args: string[], options: object) => {
      if (args[0] === "push" && !raced) {
        raced = true;
        await commit(f.seed, "feat: racing developer push", { "src/app.txt": "racing\n" });
        await git(f.seed, ["push", "--quiet", "origin", "feature/example"]);
      }
      return await execute(command, args, options as never);
    };
    const result = await f.reconcile({ gitImpl });
    expect(result).toMatchObject({ disposition: "retry", reason: "head-changed-before-push", bodyUpdated: false });
    expect(await f.remoteHead()).not.toBe(before);
    expect(await f.remoteFile("src/app.txt")).toBe("racing");
    expect(f.mutations).toHaveLength(0);

    const edited = await fixture();
    const readerWithEdit = { ...edited.reader, async get(path: string) {
      if (path.endsWith("/pulls/7") && edited.state.bodyReads.length === 1) edited.state.body = `${edited.state.body}\nEdited.\n`;
      return await edited.reader.get(path);
    } };
    const raceResult = await reconcileFinalization({ reader: readerWithEdit, publisher: edited.publisher, number: 7, toolRoot, remoteUrl: edited.remote, date: "2026-09-16" });
    expect(raceResult).toMatchObject({ disposition: "retry", reason: "body-changed-before-update", bodyUpdated: false });
    expect(raceResult.commits.map(commit => commit.kind)).toEqual(["finalize"]);
    expect(edited.mutations).toHaveLength(0);
  }, 120_000);

  it("skips drafts, closed, legacy, and unassociated PRs and refuses foreign heads", () => {
    const base = { ref: "develop", repo: { full_name: "owner/repo" } };
    const head = { ref: "feature/x", sha: "a".repeat(40), repo: { full_name: "owner/repo" } };
    expect(classifyFinalizationCandidate({ state: "open", draft: true, body: body(), base, head }, "owner/repo")).toEqual({ skip: "draft" });
    expect(classifyFinalizationCandidate({ state: "closed", draft: false, body: body(), base, head }, "owner/repo")).toEqual({ skip: "closed" });
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: "plain", base, head }, "owner/repo")).toEqual({ skip: "unassociated" });
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: body({ version: 2, change: "example" }), base, head }, "owner/repo")).toEqual({ skip: "legacy-version-2" });
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: "```openspec-implementation\n{\n```", base, head }, "owner/repo")).toEqual({ skip: "malformed-metadata" });
    expect(() => classifyFinalizationCandidate({ state: "open", draft: false, body: body(), base, head: { ...head, repo: { full_name: "fork/repo" } } }, "owner/repo")).toThrow("finalization-candidate-identity");
    expect(() => classifyFinalizationCandidate({ state: "open", draft: false, body: body(), base: { ...base, ref: "main" }, head }, "owner/repo")).toThrow("finalization-candidate-identity");
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: body(), base, head }, "owner/repo")).toMatchObject({ implementation: { change: "example" } });
  });

  it("fails closed on incomplete tasks without pushing", async () => {
    const f = await fixture();
    await commit(f.seed, "wip", { "openspec/changes/example/tasks.md": "## 1. Work\n\n- [ ] 1.1 Implement and verify example behavior.\n" });
    await git(f.seed, ["push", "--quiet", "origin", "feature/example"]);
    const before = await f.remoteHead();
    await expect(f.reconcile()).rejects.toThrow("tasks-incomplete");
    expect(await f.remoteHead()).toBe(before);
    expect(f.mutations).toHaveLength(0);
  }, 60_000);
});
