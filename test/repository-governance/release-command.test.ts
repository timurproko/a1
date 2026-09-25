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
function commitVersionOnRemoteBranch(f: Awaited<ReturnType<typeof fixture>>, branch: string, version: string, extra?: string) {
  const work = join(f.directory, `prepared-${branch.replaceAll("/", "-")}`);
  f.git(["worktree", "add", "--detach", work, f.initialHead]);
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
  ])("publishes %s using %s as %s from the open source, then reopens %s through one manual gate", async (current, target, stable, opening) => {
    const f = await fixture(current);
    f.setPublish(() => {
      expect(f.remoteVersion()).toBe(current);
      expect(f.pulls).toEqual([]);
    });
    f.setWait(() => {
      expect(f.git(["rev-parse", "HEAD"])).toBe(f.initialHead);
      expect(f.git(["rev-parse", "--abbrev-ref", "HEAD"])).toBe("develop");
      expect(f.git(["status", "--porcelain"])).toBe("");
      const pull = f.pulls.find(pull => pull.state === "OPEN")!;
      expect(pull.headRefName).toBe(`chore/release-${opening}`);
      const manifest = JSON.parse(f.git(["show", `${pull.headRefOid}:package.json`], f.remote));
      const lock = JSON.parse(f.git(["show", `${pull.headRefOid}:package-lock.json`], f.remote));
      const installer = JSON.parse(f.git(["show", `${pull.headRefOid}:packages/a1-install/package.json`], f.remote));
      expect(manifest).toEqual({ ...f.manifest, version: opening });
      expect(lock).toEqual({ ...f.lock, version: opening, packages: { ...f.lock.packages, "": { ...f.lock.packages[""], version: opening } } });
      expect(installer).toEqual({ ...f.installer, version: opening });
      expect(f.git(["rev-parse", "--abbrev-ref", "HEAD"], f.phaseDirectories.at(-1)!)).toBe("HEAD");
      expect(f.publications).toEqual([{ source: f.initialHead, version: stable }]);
      f.manualMerge(pull);
    });
    expect(await main([target], f.runtime)).toBe(0);
    expect(f.errors).toEqual([]);
    expect(f.remoteVersion()).toBe(opening);
    expect(await f.localVersion()).toBe(opening);
    expect(f.publications).toEqual([{ source: f.initialHead, version: stable }]);
    expect(f.pulls).toHaveLength(1);
    expect(f.phaseDirectories).toHaveLength(1);
    expect(f.phaseDirectories.every(directory => !existsSync(directory))).toBe(true);
    expect(f.git(["ls-remote", "--heads", "origin", "refs/heads/chore/release-*"])).toBe("");
    expect(f.ghCalls.every(args => args[1] !== "merge" && !args.includes("--auto"))).toBe(true);
    expect(f.gitCalls.every(call => call.args[0] !== "reset" && call.args[0] !== "tag")).toBe(true);
    expect(f.events.indexOf(`publish:${stable}`)).toBeLessThan(f.events.indexOf(`pr-create:chore/release-${opening}`));
    expect(f.events.indexOf(`pr-create:chore/release-${opening}`)).toBeLessThan(f.events.indexOf(`manual-merge:chore/release-${opening}`));
    expect(f.logs[0]).toBe(`source ${current}; stable target ${stable}; next development ${opening}`);
    expect(f.logs.join("\n")).toContain(`dispatching stable publication of ${stable} for ${f.initialHead}`);
    expect(f.events[0]).toBe("log");
  }, 20_000);

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

  it("reports an uncertain publication without preparing any reopening", async () => {
    const f = await fixture();
    f.setPublish(() => { throw new Error("publication uncertain"); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.publications).toEqual([{ source: f.initialHead, version: "0.1.8" }]);
    expect(f.pulls).toEqual([]); expect(f.phaseDirectories).toEqual([]);
    expect(f.remoteVersion()).toBe("0.1.8-dev");
    expect(f.errors.join("\n")).toContain("stable publication stopped: publication uncertain");
    expect(f.errors.join("\n")).toContain("failed or is uncertain");
  }, 20_000);

  it.each(["closed", "timeout", "query", "changed-head", "auto-merge", "cancel"])("keeps the published release and reports an unapproved reopening PR: %s", async mode => {
    const f = await fixture();
    const abort = new AbortController();
    f.setWait(() => {
      if (mode === "closed") f.pulls[0]!.state = "CLOSED";
      if (mode === "query") f.setQuery(() => { throw new Error("query unavailable"); });
      if (mode === "changed-head") f.pulls[0]!.headRefOid = "a".repeat(40);
      if (mode === "auto-merge") f.pulls[0]!.autoMergeRequest = { enabledAt: "2026-01-01" };
      if (mode === "cancel") abort.abort(new Error("fixture canceled"));
    });
    expect(await main(["patch"], { ...f.runtime, signal: abort.signal })).toBe(mode === "cancel" ? 130 : 1);
    expect(f.publications).toEqual([{ source: f.initialHead, version: "0.1.8" }]);
    expect(f.pulls).toHaveLength(1);
    expect(f.pulls[0]!.headRefName).toBe("chore/release-0.1.9-dev");
    expect(f.phaseDirectories.every(directory => existsSync(directory))).toBe(true);
    expect(f.remoteVersion()).toBe("0.1.8-dev");
    expect(f.errors.join("\n")).toContain("0.1.8 is published, but reopening 0.1.9-dev is incomplete");
    expect(f.logs.join("\n")).toContain("Manual action required");
    expect(f.ghCalls.every(args => args[1] !== "merge")).toBe(true);
  }, 20_000);

  it.each(["staged", "unstaged", "untracked", "head"])("preserves caller work appearing during the manual wait: %s", async kind => {
    const f = await fixture();
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
    const head = await commitVersionOnRemoteBranch(f, "chore/release-0.1.9-dev", "0.1.9-dev");
    f.addPull("chore/release-0.1.9-dev", head);
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.pulls).toHaveLength(1);
    expect(f.pulls[0]!.headRefOid).toBe(head);
    expect(f.phaseDirectories).toEqual([]);
    expect(f.events).not.toContain("pr-create:chore/release-0.1.9-dev");
    expect(f.publications).toEqual([{ source: f.initialHead, version: "0.1.8" }]);
    expect(f.remoteVersion()).toBe("0.1.9-dev");
    expect(f.logs.join("\n")).toContain("existing version PR");
  }, 20_000);

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
    expect(f.phaseDirectories).toEqual([]);
    expect(f.publications).toHaveLength(1);
    expect(f.git(["rev-parse", "refs/heads/chore/release-0.1.9-dev"], f.remote)).toBe(f.initialHead);
  });

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
    f.setPublish(() => {
      const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
      newer = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "unrelated follow-up"], f.remote);
      f.git(["update-ref", "refs/heads/develop", newer], f.remote);
    });
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.publications).toEqual([{ source: f.initialHead, version: "0.1.8" }]);
    const pull = f.pulls[0]!;
    expect(f.git(["rev-list", "--parents", "-n", "1", pull.headRefOid], f.remote).split(/\s+/u)[1]).toBe(newer);
    expect(f.remoteVersion()).toBe("0.1.9-dev");
  }, 20_000);

  it("stops reopening when develop no longer declares the published open version", async () => {
    const f = await fixture();
    f.setPublish(async () => {
      const work = join(f.directory, "foreign-bump");
      f.git(["worktree", "add", "--detach", work, f.initialHead]);
      await writeFile(join(work, "package.json"), `${JSON.stringify({ ...f.manifest, version: "0.3.0-dev" }, null, 2)}\n`);
      await writeFile(join(work, "package-lock.json"), `${JSON.stringify({ ...f.lock, version: "0.3.0-dev", packages: { ...f.lock.packages, "": { ...f.lock.packages[""], version: "0.3.0-dev" } } }, null, 2)}\n`);
      f.git(["add", "."], work); f.git(["commit", "-m", "foreign bump"], work);
      f.git(["push", "origin", "HEAD:refs/heads/develop"], work);
    });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.publications).toHaveLength(1);
    expect(f.pulls).toEqual([]);
    expect(f.errors.at(-1)).toContain("must consistently declare @fixture/release-command@0.1.8-dev");
    expect(f.errors.at(-1)).toContain("0.1.8 is published, but reopening 0.1.9-dev is incomplete");
  }, 20_000);
});
