import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
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
  const value = await phases.run(`create-${id}`, () => trace.measureAsync("setup", () => releaseFixture(version, trace, dispose => {
    onTestFinished(async () => {
      await phases.cleanup(`cleanup-${id}`, dispose);
      if (process.env.NATIVE_REGRESSION_DIAGNOSTICS === "1") trace.report();
    });
  })));
  return value;
}

/** Commits the reopening version on a remote branch the way a retained earlier attempt leaves it. */
function commitVersionOnRemoteBranch(f: Awaited<ReturnType<typeof fixture>>, branch: string, version: string, extra?: string, base = f.initialHead) {
  const work = join(f.directory, `prepared-${branch.replaceAll("/", "-")}`);
  f.git(["worktree", "add", "--detach", work, base]);
  const manifest = { ...f.manifest, version };
  const lock = { ...f.lock, version, packages: { ...f.lock.packages, "": { ...f.lock.packages[""], version } } };
  const installer = { ...f.installer, version };
  return (async () => {
    await writeFile(join(work, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(join(work, "package-lock.json"), `${JSON.stringify(lock, null, 2)}\n`);
    await writeFile(join(work, "packages", "a1-install", "package.json"), `${JSON.stringify(installer, null, 2)}\n`);
    if (extra) await writeFile(join(work, "unrelated.txt"), extra);
    f.git(["add", "."], work);
    f.git(["commit", "-m", `prepared ${version}`], work);
    f.git(["push", "origin", `HEAD:refs/heads/${branch}`], work);
    return f.git(["rev-parse", "HEAD"], work);
  })();
}

describe("release command with real temporary Git and fake publication services", () => {
  it.each([
    ["0.1.8-dev", "patch", "0.1.8", "0.1.9-dev"],
    ["0.1.8-dev", "minor", "0.2.0", "0.2.1-dev"],
    ["0.1.8-dev", "0.4.0", "0.4.0", "0.4.1-dev"],
  ])("reviews and publishes %s using %s as %s, then reopens %s through a second manual gate", async (current, target, stable, opening) => {
    const f = await fixture(current);
    let reviewedSource = "";
    f.setPublish(source => {
      expect(f.remoteVersion()).toBe(current);
      expect(source).toBe(reviewedSource);
      expect(f.pulls.map(pull => [pull.headRefName, pull.state])).toEqual([[`chore/release-${stable}`, "MERGED"]]);
    });
    f.setWait(() => {
      expect(f.git(["rev-parse", "HEAD"])).toBe(f.initialHead);
      expect(f.git(["rev-parse", "--abbrev-ref", "HEAD"])).toBe("develop");
      expect(f.git(["status", "--porcelain"])).toBe("");
      const pull = f.pulls.findLast(candidate => candidate.state === "OPEN")!;
      expect(f.git(["rev-parse", "--abbrev-ref", "HEAD"], f.phaseDirectories.at(-1)!)).toBe("HEAD");
      if (pull.headRefName === `chore/release-${stable}`) {
        const note = f.git(["show", `${pull.headRefOid}:docs/releases/${stable}.md`], f.remote);
        expect(note).toContain(`# A1 ${stable}`);
        reviewedSource = f.manualMerge(pull);
        return;
      }
      expect(pull.headRefName).toBe(`chore/release-${opening}`);
      const manifest = JSON.parse(f.git(["show", `${pull.headRefOid}:package.json`], f.remote));
      const lock = JSON.parse(f.git(["show", `${pull.headRefOid}:package-lock.json`], f.remote));
      const installer = JSON.parse(f.git(["show", `${pull.headRefOid}:packages/a1-install/package.json`], f.remote));
      expect(manifest).toEqual({ ...f.manifest, version: opening });
      expect(lock).toEqual({ ...f.lock, version: opening, packages: { ...f.lock.packages, "": { ...f.lock.packages[""], version: opening } } });
      expect(installer).toEqual({ ...f.installer, version: opening });
      expect(f.publications).toEqual([{ source: reviewedSource, version: stable }]);
      f.manualMerge(pull);
    });
    expect(await main([target], f.runtime)).toBe(0);
    expect(f.errors).toEqual([]);
    expect(f.remoteVersion()).toBe(opening);
    expect(await f.localVersion()).toBe(opening);
    expect(f.publications).toEqual([{ source: reviewedSource, version: stable }]);
    expect(f.pulls).toHaveLength(2);
    expect(f.phaseDirectories).toHaveLength(2);
    expect(f.phaseDirectories.every(directory => !existsSync(directory))).toBe(true);
    expect(f.git(["ls-remote", "--heads", "origin", "refs/heads/chore/release-*"])).toBe("");
    expect(f.ghCalls.every(args => args[1] !== "merge" && !args.includes("--auto"))).toBe(true);
    expect(f.gitCalls.every(call => call.args[0] !== "reset" && call.args[0] !== "tag")).toBe(true);
    expect(f.events.indexOf(`manual-merge:chore/release-${stable}`)).toBeLessThan(f.events.indexOf(`publish:${stable}`));
    expect(f.events.indexOf(`publish:${stable}`)).toBeLessThan(f.events.indexOf(`pr-create:chore/release-${opening}`));
    expect(f.events.indexOf(`pr-create:chore/release-${opening}`)).toBeLessThan(f.events.indexOf(`manual-merge:chore/release-${opening}`));
    expect(f.logs[0]).toBe(`source ${current}; stable target ${stable}; next development ${opening}`);
    expect(f.logs.join("\n")).toContain(`dispatching stable publication of ${stable} for reviewed source ${reviewedSource}`);
    expect(f.events[0]).toBe("log");
  }, 25_000);

  it("keeps automatic housekeeping isolated from real disposable Git operations", async () => {
    const f = await fixture();
    for (const repository of [f.cwd, f.remote]) {
      expect(f.git(["config", "--get", "gc.auto"], repository)).toBe("0");
      expect(f.git(["config", "--get", "maintenance.auto"], repository)).toBe("false");
      expect(f.git(["config", "--get", "receive.autoGC"], repository)).toBe("false");
    }
    expect(f.git(["fsck", "--no-dangling"], f.remote)).toBe("");
    expect(f.remoteVersion()).toBe("0.1.8-dev");
    expect(f.publications).toEqual([]);
  });

  it("requires a target before even reading or mutating release state", async () => {
    const f = await fixture();
    for (const args of [[], ["unknown"], ["patch", "extra"], ["0.4.0-dev"], ["00.4.0"]]) {
      expect(await main(args, f.runtime)).toBe(2);
    }
    expect(f.gitCalls).toEqual([]); expect(f.ghCalls).toEqual([]); expect(f.events).toEqual([]);
    expect(f.publications).toEqual([]); expect(f.phaseDirectories).toEqual([]);
    const result = spawnSync(process.execPath, [resolve("scripts/release/release.mjs")], { cwd: f.directory, encoding: "utf8" });
    expect(result.status).toBe(2); expect(result.stderr).toContain("A target is required");
    expect(f.remoteVersion()).toBe("0.1.8-dev");
  });

  it.each(["not-semver", "01.1.8"])("rejects invalid current version %s before Git or publication", async version => {
    const f = await fixture(version);
    expect(await main(["patch"], f.runtime)).toBe(2);
    expect(f.gitCalls).toEqual([]); expect(f.ghCalls).toEqual([]); expect(f.publications).toEqual([]);
  });

  it.each(["0.1.8", "0.1.8-dev.5", "0.1.8-rc.1"])("refuses develop declaring %s instead of one open development version", async version => {
    const f = await fixture(version);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.errors.at(-1)).toContain("develop must declare an open development version");
    expect(f.gitCalls).toEqual([]); expect(f.ghCalls).toEqual([]); expect(f.publications).toEqual([]);
  });

  it.each(["registry", "registry-error", "tag"])("refuses an existing or unverifiable release: %s", async mode => {
    const f = await fixture();
    if (mode === "registry") f.setRegistry(() => ({ version: "0.1.8" }));
    if (mode === "registry-error") f.setRegistry(() => { throw new Error("registry unavailable"); });
    if (mode === "tag") f.git(["update-ref", "refs/tags/v0.1.8", f.initialHead], f.remote);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.phaseDirectories).toEqual([]); expect(f.pulls).toEqual([]); expect(f.publications).toEqual([]);
    expect(f.errors.at(-1)).toContain("Publication of 0.1.8 was not dispatched");
    expect(f.remoteVersion()).toBe("0.1.8-dev");
  });

  it("follows maintainer edits on the live release-review head before publishing", async () => {
    const f = await fixture();
    let edited = false;
    f.setWait(async () => {
      const pull = f.pulls.findLast(candidate => candidate.state === "OPEN")!;
      if (pull.headRefName === "chore/release-0.1.8" && !edited) {
        edited = true;
        const worktree = f.phaseDirectories.at(-1)!;
        await writeFile(join(worktree, "docs", "releases", "0.1.8.md"), "# A1 0.1.8\n\n## Fixes\n\n- Maintainer-edited note.\n");
        f.git(["add", "docs/releases/0.1.8.md"], worktree);
        f.git(["commit", "-m", "docs: edit release note"], worktree);
        f.git(["push", "origin", "HEAD:refs/heads/chore/release-0.1.8"], worktree);
        pull.headRefOid = f.git(["rev-parse", "HEAD"], worktree);
        return;
      }
      f.manualMerge(pull);
    });
    expect(await main(["patch"], f.runtime)).toBe(0);
    const review = f.pulls.find(pull => pull.headRefName === "chore/release-0.1.8")!;
    expect(f.git(["show", `${review.mergeCommit!.oid}:docs/releases/0.1.8.md`], f.remote)).toContain("Maintainer-edited note");
    expect(f.publications).toEqual([{ source: review.mergeCommit!.oid, version: "0.1.8" }]);
  }, 25_000);

  it.each(["unsupported-path", "bot-merge", "auto-merge", "closed", "stale-base"])("refuses invalid release-note review evidence: %s", async mode => {
    const f = await fixture();
    f.setWait(async () => {
      const pull = f.pulls.findLast(candidate => candidate.state === "OPEN")!;
      if (mode === "unsupported-path") {
        const worktree = f.phaseDirectories.at(-1)!;
        await writeFile(join(worktree, "unexpected.txt"), "not allowed\n");
        f.git(["add", "unexpected.txt"], worktree);
        f.git(["commit", "-m", "unexpected release change"], worktree);
        f.git(["push", "origin", "HEAD:refs/heads/chore/release-0.1.8"], worktree);
        pull.headRefOid = f.git(["rev-parse", "HEAD"], worktree);
      } else if (mode === "bot-merge") {
        f.manualMerge(pull);
        pull.mergedBy = { login: "release-bot", __typename: "Bot" };
      } else if (mode === "auto-merge") {
        pull.autoMergeRequest = { enabledAt: "2026-01-01" };
      } else if (mode === "closed") {
        pull.state = "CLOSED";
      } else {
        const current = f.git(["rev-parse", "refs/heads/develop"], f.remote);
        const tree = f.git(["rev-parse", `${current}^{tree}`], f.remote);
        const advanced = f.git(["commit-tree", tree, "-p", current, "-m", "advance while reviewing"], f.remote);
        f.git(["update-ref", "refs/heads/develop", advanced, current], f.remote);
      }
    });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.publications).toEqual([]);
    expect(f.errors.join("\n")).toMatch(/release-note review stopped/i);
  }, 20_000);

  it("reuses an already reviewed current develop source after an uncertain publication", async () => {
    const f = await fixture();
    f.setPublish(() => { throw new Error("publication uncertain"); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    const reviewed = f.pulls[0]!.mergeCommit!.oid;
    f.git(["merge", "--ff-only", reviewed]);
    f.setPublish(() => undefined);
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.pulls.filter(pull => pull.headRefName === "chore/release-0.1.8")).toHaveLength(1);
    expect(f.publications.at(-1)).toEqual({ source: reviewed, version: "0.1.8" });
    expect(f.logs.join("\n")).toContain("reusing release notes already reviewed on current develop");
  }, 30_000);

  it("creates a fresh source-suffixed review when develop advances after an earlier review", async () => {
    const f = await fixture();
    f.setPublish(() => { throw new Error("publication uncertain"); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    const reviewed = f.pulls[0]!.mergeCommit!.oid;
    const tree = f.git(["rev-parse", `${reviewed}^{tree}`], f.remote);
    const advanced = f.git(["commit-tree", tree, "-p", reviewed, "-m", "new user change"], f.remote);
    f.git(["update-ref", "refs/heads/develop", advanced, reviewed], f.remote);
    f.git(["fetch", "origin", "develop"]);
    f.git(["merge", "--ff-only", "origin/develop"]);
    f.setReleaseChanges(async () => [{ number: 42, title: "feat: newly covered work", url: "https://github.com/acme/a1/pull/42" }]);
    f.setPublish(() => undefined);
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.pulls.map(pull => pull.headRefName)).toContain(`chore/release-0.1.8-${advanced.slice(0, 12)}`);
    const fresh = f.pulls.find(pull => pull.headRefName.endsWith(advanced.slice(0, 12)))!;
    expect(f.publications.at(-1)?.source).toBe(fresh.mergeCommit!.oid);
  }, 35_000);

  it("reports an uncertain publication only after release-note review and without reopening", async () => {
    const f = await fixture();
    f.setPublish(() => { throw new Error("publication uncertain"); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    const review = f.pulls[0]!;
    expect(review.headRefName).toBe("chore/release-0.1.8");
    expect(review.state).toBe("MERGED");
    expect(f.publications).toEqual([{ source: review.mergeCommit!.oid, version: "0.1.8" }]);
    expect(f.pulls).toHaveLength(1);
    expect(f.remoteVersion()).toBe("0.1.8-dev");
    expect(f.errors.join("\n")).toContain("stable publication stopped: publication uncertain");
    expect(f.errors.join("\n")).toContain("failed or is uncertain");
  }, 20_000);

  it.each(["closed", "timeout", "query", "changed-head", "auto-merge", "cancel"])("keeps the published release and reports an unapproved reopening PR: %s", async mode => {
    const f = await fixture();
    const abort = new AbortController();
    f.setWait(() => {
      const pull = f.pulls.findLast(candidate => candidate.state === "OPEN")!;
      if (pull.headRefName === "chore/release-0.1.8") { f.manualMerge(pull); return; }
      if (mode === "closed") pull.state = "CLOSED";
      if (mode === "query") f.setQuery(() => { throw new Error("query unavailable"); });
      if (mode === "changed-head") pull.headRefOid = "a".repeat(40);
      if (mode === "auto-merge") pull.autoMergeRequest = { enabledAt: "2026-01-01" };
      if (mode === "cancel") abort.abort(new Error("fixture canceled"));
    });
    expect(await main(["patch"], { ...f.runtime, signal: abort.signal })).toBe(mode === "cancel" ? 130 : 1);
    const review = f.pulls[0]!;
    expect(f.publications).toEqual([{ source: review.mergeCommit!.oid, version: "0.1.8" }]);
    expect(f.pulls).toHaveLength(2);
    expect(f.pulls[1]!.headRefName).toBe("chore/release-0.1.9-dev");
    expect(existsSync(f.phaseDirectories[0]!)).toBe(false);
    expect(existsSync(f.phaseDirectories[1]!)).toBe(true);
    expect(f.remoteVersion()).toBe("0.1.8-dev");
    expect(f.errors.join("\n")).toContain("0.1.8 is published, but reopening 0.1.9-dev is incomplete");
    expect(f.logs.join("\n")).toContain("Manual action required");
    expect(f.ghCalls.every(args => args[1] !== "merge")).toBe(true);
  }, 20_000);

  it.each(["staged", "unstaged", "untracked", "head"])("preserves caller work appearing during the manual wait: %s", async kind => {
    const f = await fixture();
    let savedHead = f.initialHead;
    let savedStatus = "";
    let changed = false;
    f.setWait(async () => {
      if (!changed) {
        changed = true;
        const file = kind === "untracked" ? "new-note.txt" : "unrelated.txt";
        await writeFile(join(f.cwd, file), "new local work\n");
        if (kind === "staged" || kind === "head") f.git(["add", file]);
        if (kind === "head") f.git(["commit", "-m", "local work during release"]);
        savedHead = f.git(["rev-parse", "HEAD"]);
        savedStatus = f.git(["status", "--porcelain"]);
      }
      f.manualMerge();
    });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.remoteVersion()).toBe("0.1.9-dev");
    expect(f.git(["rev-parse", "HEAD"])).toBe(savedHead);
    expect(f.git(["status", "--porcelain"])).toBe(savedStatus);
    expect(await readFile(join(f.cwd, kind === "untracked" ? "new-note.txt" : "unrelated.txt"), "utf8")).toBe("new local work\n");
    expect(f.logs.join("\n")).toContain("caller checkout changed and was left untouched");
  }, 20_000);

  it("retains a dirty owned phase and never removes an unrelated worktree", async () => {
    const f = await fixture();
    const unrelated = join(f.directory, "other-session");
    f.git(["worktree", "add", "--detach", unrelated, f.initialHead]);
    await writeFile(join(unrelated, "other-note.txt"), "other session");
    f.setWait(async () => {
      await writeFile(join(f.phaseDirectories[0]!, "private-note.txt"), "keep phase work");
      f.manualMerge();
    });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(await readFile(join(f.phaseDirectories[0]!, "private-note.txt"), "utf8")).toBe("keep phase work");
    expect(await readFile(join(unrelated, "other-note.txt"), "utf8")).toBe("other session");
    expect(f.git(["rev-parse", "HEAD"], unrelated)).toBe(f.initialHead);
    expect(f.logs.join("\n")).toContain("retaining changed or unverified phase worktree");
    expect(f.gitCalls.some(call => call.args[0] === "worktree" && call.args[1] === "remove" && call.args[2] === unrelated)).toBe(false);
  }, 20_000);

  it("retains a remote reopening branch advanced after its verified merge", async () => {
    const f = await fixture();
    let advanced = "";
    f.setWait(() => {
      const pull = f.pulls.find(pull => pull.state === "OPEN")!;
      advanced = f.manualMerge(pull);
      f.git(["update-ref", `refs/heads/${pull.headRefName}`, advanced], f.remote);
    });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.git(["rev-parse", "refs/heads/chore/release-0.1.9-dev"], f.remote)).toBe(advanced);
    expect(f.logs.join("\n")).toContain("retaining advanced remote branch");
  }, 20_000);

  it("observes an exact matching pending reopening PR without replacing it", async () => {
    const f = await fixture();
    let head = "";
    f.setPublish(async source => {
      head = await commitVersionOnRemoteBranch(f, "chore/release-0.1.9-dev", "0.1.9-dev", undefined, source);
      expect(f.git(["rev-list", "--parents", "-n", "1", head]).split(/\s+/u)[1]).toBe(source);
      f.addPull("chore/release-0.1.9-dev", head);
    });
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.pulls).toHaveLength(2);
    expect(f.pulls.find(pull => pull.headRefName === "chore/release-0.1.9-dev")!.headRefOid).toBe(head);
    expect(f.phaseDirectories).toHaveLength(1);
    expect(existsSync(f.phaseDirectories[0]!)).toBe(false);
    expect(f.events).not.toContain("pr-create:chore/release-0.1.9-dev");
    expect(f.publications).toEqual([{ source: f.pulls.find(pull => pull.headRefName === "chore/release-0.1.8")!.mergeCommit!.oid, version: "0.1.8" }]);
    expect(f.remoteVersion()).toBe("0.1.9-dev");
    expect(f.logs.join("\n")).toContain("existing version PR");
  }, 25_000);

  it("refuses a conflicting existing reopening PR without overwriting its head", async () => {
    const f = await fixture();
    const head = await commitVersionOnRemoteBranch(f, "chore/release-0.1.9-dev", "0.1.9-dev", "unexpected change\n");
    f.addPull("chore/release-0.1.9-dev", head);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.errors.at(-1)).toContain("not a single version-only commit");
    expect(f.errors.at(-1)).toContain("0.1.8 is published, but reopening 0.1.9-dev is incomplete");
    expect(f.git(["rev-parse", "refs/heads/chore/release-0.1.9-dev"], f.remote)).toBe(head);
    expect(f.publications).toHaveLength(1);
    expect(f.remoteVersion()).toBe("0.1.8-dev");
  }, 20_000);

  it("refuses an existing reopening branch without a PR instead of replacing it", async () => {
    const f = await fixture();
    f.git(["update-ref", "refs/heads/chore/release-0.1.9-dev", f.initialHead], f.remote);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.errors.at(-1)).toContain("already exists without a matching PR");
    expect(f.phaseDirectories).toHaveLength(1);
    expect(existsSync(f.phaseDirectories[0]!)).toBe(false);
    expect(f.publications).toHaveLength(1);
    expect(f.git(["rev-parse", "refs/heads/chore/release-0.1.9-dev"], f.remote)).toBe(f.initialHead);
  }, 20_000);

  it.each(["dirty", "branch", "behind", "lock"])("checks preflight before publishing: %s", async failure => {
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
    expect(f.publications).toEqual([]); expect(f.pulls).toEqual([]); expect(f.phaseDirectories).toEqual([]);
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
    expect(f.publications).toEqual([]);
    expect(f.errors.at(-1)).toContain("refusing to substitute another commit");
  }, 20_000);

  it("reopens from the then-current develop tip when unrelated work lands during publication", async () => {
    const f = await fixture();
    let newer = "";
    f.setPublish(source => {
      const tree = f.git(["rev-parse", `${source}^{tree}`], f.remote);
      newer = f.git(["commit-tree", tree, "-p", source, "-m", "unrelated follow-up"], f.remote);
      f.git(["update-ref", "refs/heads/develop", newer], f.remote);
    });
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(0);
    const review = f.pulls.find(pull => pull.headRefName === "chore/release-0.1.8")!;
    expect(f.publications).toEqual([{ source: review.mergeCommit!.oid, version: "0.1.8" }]);
    const pull = f.pulls.find(candidate => candidate.headRefName === "chore/release-0.1.9-dev")!;
    expect(f.git(["rev-list", "--parents", "-n", "1", pull.headRefOid], f.remote).split(/\s+/u)[1]).toBe(newer);
    expect(f.remoteVersion()).toBe("0.1.9-dev");
  }, 20_000);

  it("stops reopening when develop no longer declares the published open version", async () => {
    const f = await fixture();
    f.setPublish(async source => {
      const work = join(f.directory, "foreign-bump");
      f.git(["worktree", "add", "--detach", work, source]);
      await writeFile(join(work, "package.json"), `${JSON.stringify({ ...f.manifest, version: "0.3.0-dev" }, null, 2)}\n`);
      await writeFile(join(work, "package-lock.json"), `${JSON.stringify({ ...f.lock, version: "0.3.0-dev", packages: { ...f.lock.packages, "": { ...f.lock.packages[""], version: "0.3.0-dev" } } }, null, 2)}\n`);
      f.git(["add", "."], work); f.git(["commit", "-m", "foreign bump"], work);
      f.git(["push", "origin", "HEAD:refs/heads/develop"], work);
    });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.publications).toHaveLength(1);
    expect(f.pulls.map(pull => pull.headRefName)).toEqual(["chore/release-0.1.8"]);
    expect(f.errors.at(-1)).toContain("must consistently declare @fixture/release-command@0.1.8-dev");
    expect(f.errors.at(-1)).toContain("0.1.8 is published, but reopening 0.1.9-dev is incomplete");
  }, 20_000);
});
