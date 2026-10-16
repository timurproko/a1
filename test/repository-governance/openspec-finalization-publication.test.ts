import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { parseImplementation } from "../../scripts/governance/openspec-archive-policy.mjs";
import { parseConditionalAcceptance } from "../../scripts/governance/openspec-delivery-policy.mjs";
import { classifyFinalizationCandidate, reconcileFinalization } from "../../scripts/governance/openspec-finalization-publication.mjs";
import { reportResult } from "../../scripts/governance/publish-openspec-finalization.mjs";

const execute = promisify(execFile);
const roots: string[] = [];
const toolRoot = resolve("node_modules/@fission-ai/openspec");
const requirement = (name: string, text: string) => `### Requirement: ${name}\nThe system SHALL ${text}.\n\n#### Scenario: ${name}\n- **WHEN** ${name.toLowerCase()} is evaluated\n- **THEN** it SHALL ${text}\n`;
const spec = (body: string) => `# example Specification\n\n## Purpose\n\nDefine an example capability with enough detail for finalization tests.\n\n## Requirements\n\n${body}`;
const proposal = `## Why\n\nImprove example behavior.\n\n## What Changes\n\n- Improve it.\n\n## Capabilities\n\n### New Capabilities\n\nNone.\n\n### Modified Capabilities\n\n- \`example\`: Improve behavior.\n\n## Impact\n\nFixture only.\n`;
const finalizedHeadFromBody = (text: string) => {
  const implementation = parseImplementation(text);
  return implementation?.version === 3 ? implementation.finalizedHead : undefined;
};
const body = (metadata: unknown = { version: 3, change: "example" }) => `## Proposal\n\nDeliver the example behavior.\n\n## Implementation\n\n- [x] Implement the updated example behavior and its focused fixture evidence.\n- [x] Reconcile the detailed example tasks and delivery documentation.\n\n## Acceptance\n\n- Using the example preserves the updated observable behavior.\n\n## Automation\n\n<details>\n<summary>Used by CI to link this PR to its OpenSpec change</summary>\n\n\`\`\`openspec-implementation\n${JSON.stringify(metadata, null, 2)}\n\`\`\`\n\n</details>\n`;

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
  const state = { body: body(), draft: false, state: "open", bodyReads: [] as string[], readyCalls: 0 };
  const mutations: { path: string; method: string; body: { body: string } }[] = [];
  const reader = { repository: "owner/repo", prefix: "/repos/owner/repo",
    async get(path: string) {
      if (path.endsWith("/git/ref/heads/develop")) return { object: { sha: await git(root, ["--git-dir", remote, "rev-parse", "refs/heads/develop"]) } };
      if (path.endsWith("/pulls/7")) {
        state.bodyReads.push(state.body);
        return { number: 7, node_id: "PR_example", state: state.state, draft: state.draft, body: state.body,
          base: { ref: "develop", sha: await git(root, ["--git-dir", remote, "rev-parse", "refs/heads/develop"]),
            repo: { full_name: "owner/repo" } },
          head: { ref: "feature/example", sha: await git(root, ["--git-dir", remote, "rev-parse", "refs/heads/feature/example"]), repo: { full_name: "owner/repo" } } };
      }
      throw new Error(`unexpected read ${path}`);
    } };
  const publisher = { repository: "owner/repo", actor: "archive-app[bot]", actorEmail: "1+archive-app[bot]@users.noreply.github.com", token: null,
    async mutate(path: string, method: string, value: { body: string }) { mutations.push({ path, method, body: value }); state.body = value.body; return { number: 7 }; },
    async ready(number: number, nodeId: string) {
      expect({ number, nodeId }).toEqual({ number: 7, nodeId: "PR_example" });
      state.readyCalls += 1;
      state.draft = false;
    } };
  const remoteHead = () => git(root, ["--git-dir", remote, "rev-parse", "refs/heads/feature/example"]);
  const remoteFile = async (path: string, ref: string | undefined = "refs/heads/feature/example") => await git(root, ["--git-dir", remote, "show", `${ref}:${path}`]);
  const reconcile = (overrides: Record<string, unknown> = {}) => reconcileFinalization({ reader, publisher, number: 7, toolRoot, remoteUrl: remote, date: "2026-09-16", ...overrides });
  return { root, remote, seed, state, mutations, reader, publisher, remoteHead, remoteFile, reconcile };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });

describe("trusted finalization publication", () => {
  it("fails the run with an annotation only for a blocked draft", () => {
    const lines: string[] = [];
    expect(reportResult({ disposition: "blocked", reason: "draft-acceptance-checklist-item", head: null, commits: [] }, line => lines.push(line))).toBe(1);
    expect(lines.at(-1)).toBe("::error title=OpenSpec finalization::PR stays draft: draft-acceptance-checklist-item");
    for (const disposition of ["skipped", "retry", "promoted"] as const) {
      const quiet: string[] = [];
      expect(reportResult({ disposition, reason: "draft-implementation-progress-incomplete", head: null, commits: [] }, line => quiet.push(line))).toBe(0);
      expect(quiet.join("\n")).not.toContain("::error");
    }
  });

  it("promotes one exact complete draft, then finalizes only on the ready event", async () => {
    const f = await fixture();
    f.state.draft = true;
    const before = await f.remoteHead();
    await expect(f.reconcile()).resolves.toMatchObject({ disposition: "promoted", head: before, promoted: true });
    expect(f.state).toMatchObject({ draft: false, readyCalls: 1 });
    expect(await f.remoteHead()).toBe(before);
    expect(f.mutations).toHaveLength(0);

    await expect(f.reconcile()).resolves.toMatchObject({ disposition: "finalized" });
    expect(await f.remoteHead()).not.toBe(before);
    expect(f.state.readyCalls).toBe(1);
  }, 120_000);

  it("leaves incomplete, refused, legacy, and raced draft snapshots unchanged and blocks only fully checked refusals", async () => {
    const incomplete = await fixture();
    incomplete.state.draft = true;
    incomplete.state.body = incomplete.state.body.replace("- [x] Implement the updated", "- [ ] Implement the updated");
    await expect(incomplete.reconcile()).resolves.toMatchObject({
      disposition: "skipped", reason: "draft-implementation-progress-incomplete",
    });
    expect(incomplete.state).toMatchObject({ draft: true, readyCalls: 0 });

    const legacy = await fixture();
    legacy.state.draft = true;
    legacy.state.body = legacy.state.body.replace(/- \[x\] Implement[^\n]+\n- \[x\] Reconcile[^\n]+/u, "- Implement the example behavior.");
    await expect(legacy.reconcile()).resolves.toMatchObject({
      disposition: "skipped", reason: "draft-implementation-progress-legacy-draft",
    });
    expect(legacy.state).toMatchObject({ draft: true, readyCalls: 0 });

    const placeholder = await fixture();
    placeholder.state.draft = true;
    placeholder.state.body = placeholder.state.body.replace("- Using the example preserves", "- Using <example> preserves");
    await expect(placeholder.reconcile()).resolves.toMatchObject({
      disposition: "blocked", reason: "draft-acceptance-checklist-item",
    });
    expect(placeholder.state).toMatchObject({ draft: true, readyCalls: 0 });

    const validation = await fixture();
    validation.state.draft = true;
    validation.state.body = validation.state.body.replace(/- \[x\] Reconcile[^\n]+/u, "- [x] Manually validate the example behavior in the development shell.");
    await expect(validation.reconcile()).resolves.toMatchObject({
      disposition: "blocked", reason: "draft-implementation-progress-validation",
    });
    expect(validation.state).toMatchObject({ draft: true, readyCalls: 0 });

    const unfinishedPlaceholder = await fixture();
    unfinishedPlaceholder.state.draft = true;
    unfinishedPlaceholder.state.body = placeholder.state.body.replace("- [x] Implement the updated", "- [ ] Implement the updated");
    await expect(unfinishedPlaceholder.reconcile()).resolves.toMatchObject({
      disposition: "skipped", reason: "draft-implementation-progress-incomplete",
    });

    const tasks = await fixture();
    tasks.state.draft = true;
    await commit(tasks.seed, "chore: reopen task", { "openspec/changes/example/tasks.md": "## 1. Work\n\n- [ ] 1.1 Implement and verify example behavior.\n" });
    await git(tasks.seed, ["push", "--quiet", "origin", "feature/example"]);
    await expect(tasks.reconcile()).resolves.toMatchObject({ disposition: "blocked", reason: expect.stringMatching(/^draft-/) });
    expect(tasks.state).toMatchObject({ draft: true, readyCalls: 0 });

    const raced = await fixture();
    raced.state.draft = true;
    const reader = { ...raced.reader, async get(path: string) {
      if (path.endsWith("/pulls/7") && raced.state.bodyReads.length === 1) raced.state.body = `${raced.state.body}\n`;
      return await raced.reader.get(path);
    } };
    await expect(raced.reconcile({ reader })).resolves.toMatchObject({
      disposition: "retry", reason: "draft-changed-before-ready",
    });
    expect(raced.state).toMatchObject({ draft: true, readyCalls: 0 });
  }, 120_000);

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
    expect(parseImplementation(f.mutations[0]!.body.body)).toMatchObject({
      archive,
      acceptanceManifest: `${archive}acceptance.md`,
      finalizedHead: result.pushedHead,
    });
    expect(parseConditionalAcceptance(await f.remoteFile(`${archive}acceptance.md`)).sourcePr).toBe(7);

    const repeated = await f.reconcile();
    expect(repeated).toMatchObject({ disposition: "already-finalized", commits: [], bodyUpdated: false });
    expect(await f.remoteHead()).toBe(result.pushedHead);
    expect(f.mutations).toHaveLength(1);
  }, 90_000);

  it("normalizes an existing unbound finalized body without changing the branch", async () => {
    const f = await fixture();
    const first = await f.reconcile();
    f.state.body = f.state.body.replace(`,\n  "finalizedHead": "${first.pushedHead}"`, "");
    const result = await f.reconcile();
    expect(result).toMatchObject({ disposition: "body-updated", pushedHead: first.pushedHead, commits: [], bodyUpdated: true });
    expect(await f.remoteHead()).toBe(first.pushedHead);
    expect(finalizedHeadFromBody(f.mutations.at(-1)!.body.body)).toBe(first.pushedHead);
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
    expect(result.bodyUpdated).toBe(true);
    expect(result.archive).toBe(archive);
    expect(finalizedHeadFromBody(f.mutations.at(-1)!.body.body)).toBe(result.pushedHead);
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

    const advanced = await fixture();
    const readerWithHeadAdvance = { ...advanced.reader, async get(path: string) {
      if (path.endsWith("/pulls/7") && advanced.state.bodyReads.length === 1) {
        await git(advanced.seed, ["pull", "--quiet", "origin", "feature/example"]);
        await commit(advanced.seed, "fix: advance after finalization", { "src/app.txt": "advanced\n" });
        await git(advanced.seed, ["push", "--quiet", "origin", "feature/example"]);
      }
      return await advanced.reader.get(path);
    } };
    const headRace = await reconcileFinalization({ reader: readerWithHeadAdvance, publisher: advanced.publisher, number: 7,
      toolRoot, remoteUrl: advanced.remote, date: "2026-09-16" });
    expect(headRace).toMatchObject({ disposition: "retry", reason: "head-changed-before-body-update", bodyUpdated: false });
    expect(advanced.mutations).toHaveLength(0);
  }, 120_000);

  it("skips drafts, closed, legacy, and unassociated PRs and refuses foreign heads", () => {
    const base = { ref: "develop", repo: { full_name: "owner/repo" } };
    const head = { ref: "feature/x", sha: "a".repeat(40), repo: { full_name: "owner/repo" } };
    expect(classifyFinalizationCandidate({ state: "open", draft: true, body: body(), base, head }, "owner/repo")).toEqual({ skip: "draft" });
    expect(classifyFinalizationCandidate({ state: "open", draft: true, body: body(), base, head }, "owner/repo", { allowDraft: true }))
      .toMatchObject({ draft: true, implementation: { change: "example" } });
    expect(classifyFinalizationCandidate({ state: "open", draft: true, body: body(), base,
      head: { ...head, repo: { full_name: "fork/repo" } } }, "owner/repo", { allowDraft: true }))
      .toEqual({ skip: "draft-ineligible-identity" });
    expect(classifyFinalizationCandidate({ state: "closed", draft: false, body: body(), base, head }, "owner/repo")).toEqual({ skip: "closed" });
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: "plain", base, head }, "owner/repo")).toEqual({ skip: "unassociated" });
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: body({ version: 2, change: "example" }), base, head }, "owner/repo")).toEqual({ skip: "legacy-version-2" });
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: "```openspec-implementation\n{\n```", base, head }, "owner/repo")).toEqual({ skip: "malformed-metadata" });
    expect(() => classifyFinalizationCandidate({ state: "open", draft: false, body: body(), base, head: { ...head, repo: { full_name: "fork/repo" } } }, "owner/repo")).toThrow("finalization-candidate-identity");
    expect(() => classifyFinalizationCandidate({ state: "open", draft: false, body: body(), base: { ...base, ref: "main" }, head }, "owner/repo")).toThrow("finalization-candidate-identity");
    expect(classifyFinalizationCandidate({ state: "open", draft: false, body: body(), base, head }, "owner/repo")).toMatchObject({ implementation: { change: "example" } });
  });

  it("fails closed when an unassociated ready head carries active delivery and code changes", async () => {
    const f = await fixture();
    f.state.body = "ordinary pull request";
    const base = await git(f.root, ["--git-dir", f.remote, "rev-parse", "refs/heads/develop"]);
    const head = await f.remoteHead();
    const names = (await git(f.root, ["--git-dir", f.remote, "diff", "--name-only", base, head])).split("\n").filter(Boolean);
    const tree = async (sha: string) => ({ truncated: false, tree: (await git(f.root, ["--git-dir", f.remote, "ls-tree", "-r", sha])).split("\n").filter(Boolean).map(line => {
      const match = /^(\d+) (\w+) ([a-f0-9]{40})\t(.+)$/.exec(line)!;
      return { mode: match[1], type: match[2], sha: match[3], path: match[4] };
    }) });
    const reader = { ...f.reader,
      async pages(path: string) {
        if (path === "/pulls/7/files") return names.map(filename => ({ filename, status: "modified" }));
        throw new Error(path);
      },
      async get(path: string) {
        if (path.endsWith("/pulls/7")) {
          const pull = await f.reader.get(path);
          return { ...pull, changed_files: names.length, base: { ...pull.base, sha: base } };
        }
        if (path.includes(`/git/trees/${base}`)) return await tree(base);
        if (path.includes(`/git/trees/${head}`)) return await tree(head);
        return await f.reader.get(path);
      },
    };
    await expect(f.reconcile({ reader })).rejects.toThrow("missing-implementation-association");
    expect(f.mutations).toHaveLength(0);
  }, 60_000);

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
