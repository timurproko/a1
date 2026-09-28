import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it, onTestFailed, onTestFinished } from "vitest";
import { NativeRegressionTrace } from "../support/native-regression-trace.js";
import { main } from "../../scripts/release/release.mjs";
import { releaseFixture } from "../support/release-command-fixture.js";
import { createValidationPhaseRecorder } from "../../scripts/release/validation-phase.mjs";

const phases = createValidationPhaseRecorder("release-command-fixture");
let fixtureSequence = 0;

async function fixture(version?: string) {
  const id = ++fixtureSequence;
  const trace = new NativeRegressionTrace("release-command");
  onTestFailed(() => trace.report());
  return phases.run(`create-${id}`, () => trace.measureAsync("setup", () => releaseFixture(version, trace, dispose => {
    onTestFinished(async () => {
      await phases.cleanup(`cleanup-${id}`, dispose);
      if (process.env.NATIVE_REGRESSION_DIAGNOSTICS === "1") trace.report();
    });
  })));
}

async function prepare(f: Awaited<ReturnType<typeof fixture>>, target = "patch") {
  expect(await main([target], f.runtime)).toBe(0);
  expect(f.drafts).toHaveLength(1);
  return f.drafts[0]!;
}

async function commitReopeningOnRemoteBranch(
  f: Awaited<ReturnType<typeof fixture>>,
  branch: string,
  opening: string,
  stable: string,
  note: string,
  extra?: string,
  base = f.initialHead,
) {
  const work = join(f.directory, `prepared-${branch.replaceAll("/", "-")}`);
  f.git(["worktree", "add", "--detach", work, base]);
  const manifest = { ...f.manifest, version: opening };
  const lock = { ...f.lock, version: opening, packages: { ...f.lock.packages, "": { ...f.lock.packages[""], version: opening } } };
  const installer = { ...f.installer, version: opening };
  await writeFile(join(work, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(work, "package-lock.json"), `${JSON.stringify(lock, null, 2)}\n`);
  await writeFile(join(work, "packages", "a1-install", "package.json"), `${JSON.stringify(installer, null, 2)}\n`);
  await mkdir(join(work, "docs", "releases"), { recursive: true });
  await writeFile(join(work, "docs", "releases", `${stable}.md`), note);
  if (extra) await writeFile(join(work, "unrelated.txt"), extra);
  f.git(["add", "."], work);
  f.git(["commit", "-m", `prepared ${opening}`], work);
  f.git(["push", "origin", `HEAD:refs/heads/${branch}`], work);
  return f.git(["rev-parse", "HEAD"], work);
}

describe("release command with real temporary Git and fake publication services", () => {
  it.each([
    ["0.1.8-dev", "patch", "0.1.8", "0.1.9-dev"],
    ["0.1.8-dev", "minor", "0.2.0", "0.2.1-dev"],
    ["0.1.8-dev", "0.4.0", "0.4.0", "0.4.1-dev"],
  ])("prepares %s using %s as editable draft %s without a PR or publication", async (current, target, stable, opening) => {
    const f = await fixture(current);
    const draft = await prepare(f, target);
    expect(draft).toMatchObject({ tag_name: `v${stable}`, name: `v${stable}`, target_commitish: f.initialHead, draft: true, prerelease: false });
    expect(draft.body).toContain("## Other changes");
    expect(draft.body).not.toContain(`# A1 ${stable}`);
    expect(f.pulls).toEqual([]);
    expect(f.publications).toEqual([]);
    expect(f.phaseDirectories).toEqual([]);
    expect(f.remoteVersion()).toBe(current);
    expect(await f.localVersion()).toBe(current);
    expect(f.logs[0]).toBe(`source ${current}; stable target ${stable}; next development ${opening}; mode prepare`);
    expect(f.logs.join("\n")).toContain("--approve");
  }, 20_000);

  it("publishes the exact edited draft snapshot and persists it with the reopening version", async () => {
    const f = await fixture();
    await prepare(f);
    const edited = "## New features\n\n- Maintainer-edited release content.\n";
    f.editDraft(edited);
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0]!.body).toBe(edited);
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch", "--approve"], f.runtime)).toBe(0);

    expect(f.publications).toHaveLength(1);
    const publication = f.publications[0]!;
    expect(publication.source).toBe(f.initialHead);
    expect(publication.version).toBe("0.1.8");
    expect(publication.approval).toMatchObject({ id: 1, version: "0.1.8", markdown: edited });
    expect(publication.approval.sha256).toBe(createHash("sha256").update(edited).digest("hex"));
    expect(f.pulls).toHaveLength(1);
    expect(f.pulls[0]!.headRefName).toBe("chore/release-0.1.9-dev");
    expect(f.git(["show", `${f.pulls[0]!.mergeCommit!.oid}:docs/releases/0.1.8.md`], f.remote) + "\n").toBe(edited);
    expect(f.remoteVersion()).toBe("0.1.9-dev");
    expect(await f.localVersion()).toBe("0.1.9-dev");
    expect(f.phaseDirectories).toHaveLength(1);
    expect(existsSync(f.phaseDirectories[0]!)).toBe(false);
    expect(f.events.indexOf("publish:0.1.8")).toBeLessThan(f.events.indexOf("pr-create:chore/release-0.1.9-dev"));
    expect(f.ghCalls.every(args => !(args[0] === "pr" && args[1] === "merge") && !args.includes("--auto"))).toBe(true);
  }, 25_000);

  it("keeps automatic housekeeping isolated from real disposable Git operations", async () => {
    const f = await fixture();
    for (const repository of [f.cwd, f.remote]) {
      expect(f.git(["config", "--get", "gc.auto"], repository)).toBe("0");
      expect(f.git(["config", "--get", "maintenance.auto"], repository)).toBe("false");
      expect(f.git(["config", "--get", "receive.autoGC"], repository)).toBe("false");
    }
    expect(f.git(["fsck", "--no-dangling"], f.remote)).toBe("");
  });

  it("requires a target and accepts only the optional approval flag before reading release state", async () => {
    const f = await fixture();
    for (const args of [[], ["unknown"], ["patch", "extra"], ["patch", "--approve", "extra"], ["0.4.0-dev"], ["00.4.0"]]) {
      expect(await main(args, f.runtime)).toBe(2);
    }
    expect(f.gitCalls).toEqual([]);
    expect(f.ghCalls).toEqual([]);
    const result = spawnSync(process.execPath, [resolve("scripts/release/release.mjs")], { cwd: f.directory, encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Usage:");
  });

  it.each(["not-semver", "01.1.8"])("rejects invalid current version %s before Git or publication", async version => {
    const f = await fixture(version);
    expect(await main(["patch"], f.runtime)).toBe(2);
    expect(f.gitCalls).toEqual([]);
    expect(f.ghCalls).toEqual([]);
  });

  it.each(["0.1.8", "0.1.8-dev.5", "0.1.8-rc.1"])("refuses develop declaring %s instead of one open development version", async version => {
    const f = await fixture(version);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.errors.at(-1)).toContain("develop must declare an open development version");
    expect(f.ghCalls).toEqual([]);
  });

  it.each(["registry", "registry-error", "tag"])("refuses existing or unverifiable stable identity before draft creation: %s", async mode => {
    const f = await fixture();
    if (mode === "registry") f.setRegistry(() => ({ version: "0.1.8" }));
    if (mode === "registry-error") f.setRegistry(() => { throw new Error("registry unavailable"); });
    if (mode === "tag") f.git(["update-ref", "refs/tags/v0.1.8", f.initialHead], f.remote);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
    expect(f.publications).toEqual([]);
  });

  it("requires preparation before explicit approval", async () => {
    const f = await fixture();
    expect(await main(["patch", "--approve"], f.runtime)).toBe(1);
    expect(f.errors.join("\n")).toContain("run preparation without --approve first");
    expect(f.publications).toEqual([]);
  });

  it.each(["source", "published", "prerelease", "name", "unsafe", "ambiguous"])("rejects changed draft authority: %s", async mode => {
    const f = await fixture();
    const draft = await prepare(f);
    if (mode === "source") draft.target_commitish = "a".repeat(40);
    if (mode === "published") draft.draft = false;
    if (mode === "prerelease") draft.prerelease = true;
    if (mode === "name") draft.name = "wrong";
    if (mode === "unsafe") draft.body = "## Fixes\n\n- [run](javascript:alert)\n";
    if (mode === "ambiguous") f.drafts.push({ ...draft, id: 2, html_url: "https://example.test/releases/2" });
    expect(await main(["patch", "--approve"], f.runtime)).toBe(1);
    expect(f.publications).toEqual([]);
    expect(f.pulls).toEqual([]);
  });

  it.each([
    [{ login: "release-app", type: "Bot" as const, permission: "write" }, "authenticated human GitHub user"],
    [{ login: "release-reader", type: "User" as const, permission: "read" }, "not authorized to approve"],
  ])("rejects unauthorized stable approver %#", async (approver, message) => {
    const f = await fixture();
    await prepare(f);
    f.setApprover(approver);
    expect(await main(["patch", "--approve"], f.runtime)).toBe(1);
    expect(f.errors.join("\n")).toContain(message);
    expect(f.publications).toEqual([]);
    expect(f.pulls).toEqual([]);
  });

  it("preserves an edited draft but refuses it after authoritative develop advances", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    draft.body = "## Fixes\n\n- Keep this edit.\n";
    const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
    const advanced = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "advance develop"], f.remote);
    f.git(["update-ref", "refs/heads/develop", advanced, f.initialHead], f.remote);
    f.git(["fetch", "origin", "develop"]);
    f.git(["merge", "--ff-only", "origin/develop"]);
    expect(await main(["patch", "--approve"], f.runtime)).toBe(1);
    expect(draft.body).toContain("Keep this edit");
    expect(f.publications).toEqual([]);
  }, 20_000);

  it("reports uncertain publication after approval without creating reopening work", async () => {
    const f = await fixture();
    await prepare(f);
    f.setPublish(() => { throw new Error("publication uncertain"); });
    expect(await main(["patch", "--approve"], f.runtime)).toBe(1);
    expect(f.publications).toHaveLength(1);
    expect(f.pulls).toEqual([]);
    expect(f.phaseDirectories).toEqual([]);
    expect(f.errors.join("\n")).toContain("stable publication stopped: publication uncertain");
  });

  it.each(["closed", "timeout", "query", "changed-head", "auto-merge", "bot-merge", "cancel"])("keeps the published release and reports incomplete reopening: %s", async mode => {
    const f = await fixture();
    await prepare(f);
    const abort = new AbortController();
    f.setWait(() => {
      const pull = f.pulls.findLast(candidate => candidate.state === "OPEN")!;
      if (mode === "closed") pull.state = "CLOSED";
      if (mode === "query") f.setQuery(() => { throw new Error("query unavailable"); });
      if (mode === "changed-head") pull.headRefOid = "a".repeat(40);
      if (mode === "auto-merge") pull.autoMergeRequest = { enabledAt: "2026-01-01" };
      if (mode === "bot-merge") { f.manualMerge(pull); pull.mergedBy = { login: "bot", __typename: "Bot" }; }
      if (mode === "cancel") abort.abort(new Error("fixture canceled"));
    });
    expect(await main(["patch", "--approve"], { ...f.runtime, signal: abort.signal })).toBe(mode === "cancel" ? 130 : 1);
    expect(f.publications).toHaveLength(1);
    expect(f.pulls).toHaveLength(1);
    expect(f.pulls[0]!.headRefName).toBe("chore/release-0.1.9-dev");
    expect(existsSync(f.phaseDirectories[0]!)).toBe(true);
    expect(f.errors.join("\n")).toContain("0.1.8 is published, but reopening 0.1.9-dev is incomplete");
  }, 20_000);

  it.each(["staged", "unstaged", "untracked", "head"])("preserves caller work appearing during reopening wait: %s", async kind => {
    const f = await fixture();
    await prepare(f);
    let savedHead = f.initialHead;
    let savedStatus = "";
    f.setWait(async () => {
      const file = kind === "untracked" ? "new-note.txt" : "unrelated.txt";
      await writeFile(join(f.cwd, file), "new local work\n");
      if (kind === "staged" || kind === "head") f.git(["add", file]);
      if (kind === "head") f.git(["commit", "-m", "local work during release"]);
      savedHead = f.git(["rev-parse", "HEAD"]);
      savedStatus = f.git(["status", "--porcelain"]);
      f.manualMerge();
    });
    expect(await main(["patch", "--approve"], f.runtime)).toBe(0);
    expect(f.git(["rev-parse", "HEAD"])).toBe(savedHead);
    expect(f.git(["status", "--porcelain"])).toBe(savedStatus);
    expect(await readFile(join(f.cwd, kind === "untracked" ? "new-note.txt" : "unrelated.txt"), "utf8")).toBe("new local work\n");
    expect(f.logs.join("\n")).toContain("caller checkout changed and was left untouched");
  }, 20_000);

  it("observes an exact matching pending reopening PR without replacing it", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    const note = "## Fixes\n\n- Reviewed.\n";
    draft.body = note;
    let head = "";
    f.setPublish(async source => {
      head = await commitReopeningOnRemoteBranch(f, "chore/release-0.1.9-dev", "0.1.9-dev", "0.1.8", note, undefined, source);
      f.addPull("chore/release-0.1.9-dev", head);
    });
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch", "--approve"], f.runtime)).toBe(0);
    expect(f.pulls).toHaveLength(1);
    expect(f.pulls[0]!.headRefOid).toBe(head);
    expect(f.phaseDirectories).toEqual([]);
    expect(f.events).not.toContain("pr-create:chore/release-0.1.9-dev");
    expect(f.remoteVersion()).toBe("0.1.9-dev");
  }, 25_000);

  it("refuses a conflicting reopening PR without overwriting it", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    const note = draft.body;
    const head = await commitReopeningOnRemoteBranch(f, "chore/release-0.1.9-dev", "0.1.9-dev", "0.1.8", note, "unexpected\n");
    f.addPull("chore/release-0.1.9-dev", head);
    expect(await main(["patch", "--approve"], f.runtime)).toBe(1);
    expect(f.errors.at(-1)).toContain("not one exact version-and-release-note commit");
    expect(f.git(["rev-parse", "refs/heads/chore/release-0.1.9-dev"], f.remote)).toBe(head);
    expect(f.publications).toHaveLength(1);
  }, 20_000);

  it.each(["dirty", "branch", "behind", "lock"])("checks preflight before draft or publication mutation: %s", async failure => {
    const f = await fixture();
    if (failure === "dirty") await writeFile(join(f.cwd, "untracked.txt"), "preserve me");
    if (failure === "branch") f.git(["switch", "-c", "other"]);
    if (failure === "behind") {
      const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
      const tip = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "other work"], f.remote);
      f.git(["update-ref", "refs/heads/develop", tip], f.remote);
    }
    if (failure === "lock") await writeFile(join(f.cwd, "package-lock.json"), JSON.stringify({ ...f.lock, version: "0.0.0" }));
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
    expect(f.publications).toEqual([]);
  });

  it("rechecks source identity after the asynchronous registry guard", async () => {
    const f = await fixture();
    f.setRegistry(() => {
      const base = f.git(["rev-parse", "refs/heads/develop"], f.remote);
      const tree = f.git(["rev-parse", `${base}^{tree}`], f.remote);
      const tip = f.git(["commit-tree", tree, "-p", base, "-m", "advance during registry check"], f.remote);
      f.git(["update-ref", "refs/heads/develop", tip], f.remote);
      return null;
    });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
    expect(f.errors.at(-1)).toContain("refusing to substitute another commit");
  }, 20_000);

  it("reopens from the then-current develop tip when unrelated work lands during publication", async () => {
    const f = await fixture();
    await prepare(f);
    let newer = "";
    f.setPublish(source => {
      const tree = f.git(["rev-parse", `${source}^{tree}`], f.remote);
      newer = f.git(["commit-tree", tree, "-p", source, "-m", "unrelated follow-up"], f.remote);
      f.git(["update-ref", "refs/heads/develop", newer], f.remote);
    });
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch", "--approve"], f.runtime)).toBe(0);
    const pull = f.pulls[0]!;
    expect(f.git(["rev-list", "--parents", "-n", "1", pull.headRefOid], f.remote).split(/\s+/u)[1]).toBe(newer);
    expect(f.remoteVersion()).toBe("0.1.9-dev");
  }, 20_000);
});
