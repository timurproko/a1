import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { main } from "../../scripts/release/release.mjs";
import { releaseFixture } from "../support/release-command-fixture.js";

async function fixture(version?: string) {
  const value = await releaseFixture(version);
  onTestFinished(() => value.dispose());
  return value;
}

describe("release command with real temporary Git and fake publication services", () => {
  it.each([
    ["0.1.8-dev", "patch", "0.1.8", "0.1.9-dev"],
    ["0.1.8", "patch", "0.1.9", "0.1.10-dev"],
    ["0.1.8-dev", "0.4.0", "0.4.0", "0.4.1-dev"],
  ])("releases %s using %s as %s then opens %s only through manual gates", async (current, target, stable, opening) => {
    const f = await fixture(current);
    f.setWait(() => {
      expect(f.git(["rev-parse", "HEAD"])).toBe(f.initialHead);
      expect(f.git(["rev-parse", "--abbrev-ref", "HEAD"])).toBe("develop");
      expect(f.git(["status", "--porcelain"])).toBe("");
      const pull = f.pulls.find(pull => pull.state === "OPEN")!;
      const version = pull.headRefName.slice("chore/release-".length);
      const manifest = JSON.parse(f.git(["show", `${pull.headRefOid}:package.json`], f.remote));
      const lock = JSON.parse(f.git(["show", `${pull.headRefOid}:package-lock.json`], f.remote));
      expect(manifest).toEqual({ ...f.manifest, version });
      expect(lock).toEqual({ ...f.lock, version, packages: { ...f.lock.packages, "": { ...f.lock.packages[""], version } } });
      expect(f.git(["rev-parse", "--abbrev-ref", "HEAD"], f.phaseDirectories.at(-1)!)).toBe("HEAD");
      if (version === stable) expect(f.publications).toEqual([]);
      else expect(f.publications).toEqual([{ source: f.pulls[0]!.mergeCommit!.oid, version: stable }]);
      f.manualMerge(pull);
    });
    expect(await main([target], f.runtime)).toBe(0);
    expect(f.errors).toEqual([]);
    expect(f.remoteVersion()).toBe(opening);
    expect(await f.localVersion()).toBe(opening);
    expect(f.publications).toEqual([{ source: f.pulls[0]!.mergeCommit!.oid, version: stable }]);
    expect(f.phaseDirectories.every(directory => !existsSync(directory))).toBe(true);
    expect(f.git(["ls-remote", "--heads", "origin", "refs/heads/chore/release-*"])).toBe("");
    expect(f.ghCalls.every(args => args[1] !== "merge" && !args.includes("--auto"))).toBe(true);
    expect(f.gitCalls.every(call => call.args[0] !== "reset" && call.args[0] !== "tag")).toBe(true);
    expect(f.events.indexOf(`manual-merge:chore/release-${stable}`)).toBeLessThan(f.events.indexOf(`publish:${stable}`));
    expect(f.events.indexOf(`publish:${stable}`)).toBeLessThan(f.events.indexOf(`pr-create:chore/release-${opening}`));
    expect(f.logs[0]).toBe(`source ${current}; stable target ${stable}; next development ${opening}`);
    expect(f.events[0]).toBe("log");
  }, 20_000);

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

  it.each(["registry", "registry-error", "tag"])("refuses an existing or unverifiable release: %s", async mode => {
    const f = await fixture();
    if (mode === "registry") f.setRegistry(() => ({ version: "0.1.8" }));
    if (mode === "registry-error") f.setRegistry(() => { throw new Error("registry unavailable"); });
    if (mode === "tag") f.git(["update-ref", "refs/tags/v0.1.8", f.initialHead], f.remote);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.phaseDirectories).toEqual([]); expect(f.pulls).toEqual([]); expect(f.publications).toEqual([]);
    expect(f.remoteVersion()).toBe("0.1.8-dev");
  });

  it.each(["closed", "timeout", "query", "changed-head", "auto-merge", "cancel"])("does not advance an unapproved stable PR: %s", async mode => {
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
    expect(f.publications).toEqual([]); expect(f.pulls).toHaveLength(1);
    expect(f.phaseDirectories.every(directory => existsSync(directory))).toBe(true);
    expect(f.errors.join("\n")).toContain("Publication of 0.1.8 was not dispatched");
    expect(f.logs.join("\n")).toContain("Manual action required");
    expect(f.ghCalls.every(args => args[1] !== "merge")).toBe(true);
  }, 20_000);

  it.each(["failure", "reopening-pending"])("distinguishes publication and reopening outcome: %s", async mode => {
    const f = await fixture();
    if (mode === "failure") f.setPublish(() => { throw new Error("publication uncertain"); });
    else f.setWait(() => { if (f.publications.length === 0) f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.publications).toHaveLength(1);
    expect(f.pulls).toHaveLength(mode === "failure" ? 1 : 2);
    expect(f.remoteVersion()).toBe("0.1.8");
    expect(f.errors.join("\n")).toContain(mode === "failure" ? "failed or is uncertain" : "0.1.8 is published, but reopening 0.1.9-dev is incomplete");
  }, 20_000);

  it.each(["staged", "unstaged", "untracked", "head"])("preserves caller work appearing during a manual wait: %s", async kind => {
    const f = await fixture();
    let savedHead = f.initialHead;
    let savedStatus = "";
    f.setWait(async () => {
      if (f.pulls.length === 1) {
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
      if (f.pulls.length === 1) await writeFile(join(f.phaseDirectories[0]!, "private-note.txt"), "keep phase work");
      f.manualMerge();
    });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(await readFile(join(f.phaseDirectories[0]!, "private-note.txt"), "utf8")).toBe("keep phase work");
    expect(await readFile(join(unrelated, "other-note.txt"), "utf8")).toBe("other session");
    expect(f.git(["rev-parse", "HEAD"], unrelated)).toBe(f.initialHead);
    expect(f.logs.join("\n")).toContain("retaining changed or unverified phase worktree");
    expect(f.gitCalls.some(call => call.args[0] === "worktree" && call.args[1] === "remove" && call.args[2] === unrelated)).toBe(false);
  }, 20_000);

  it("retains a remote release branch advanced after its verified merge", async () => {
    const f = await fixture();
    let advanced = "";
    f.setWait(() => {
      const pull = f.pulls.find(pull => pull.state === "OPEN")!;
      const merged = f.manualMerge(pull);
      if (f.pulls.length === 1) {
        advanced = merged;
        f.git(["update-ref", `refs/heads/${pull.headRefName}`, merged], f.remote);
      }
    });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.git(["rev-parse", "refs/heads/chore/release-0.1.8"], f.remote)).toBe(advanced);
    expect(f.logs.join("\n")).toContain("retaining advanced remote branch");
  }, 20_000);

  it("can observe an exact matching pending PR without replacing it or its retained worktree", async () => {
    const f = await fixture();
    f.setWait(() => {});
    expect(await main(["patch"], f.runtime)).toBe(1);
    const head = f.pulls[0]!.headRefOid;
    const firstDirectory = f.phaseDirectories[0]!;
    f.setWait(() => { f.manualMerge(); });
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.pulls[0]!.headRefOid).toBe(head);
    expect(f.pulls).toHaveLength(2);
    expect(f.phaseDirectories).toHaveLength(2);
    expect(existsSync(firstDirectory)).toBe(true);
    expect(f.publications).toHaveLength(1);
  }, 20_000);

  it("refuses a conflicting existing version PR without overwriting its head", async () => {
    const f = await fixture();
    f.setWait(() => {});
    expect(await main(["patch"], f.runtime)).toBe(1);
    const phase = f.phaseDirectories[0]!;
    await writeFile(join(phase, "unrelated.txt"), "unexpected change");
    f.git(["add", "unrelated.txt"], phase); f.git(["commit", "-m", "unrelated change"], phase);
    f.git(["push", "origin", "HEAD:refs/heads/chore/release-0.1.8"], phase);
    const advanced = f.git(["rev-parse", "HEAD"], phase);
    f.pulls[0]!.headRefOid = advanced;
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.errors.at(-1)).toContain("not a single version-only commit");
    expect(f.git(["rev-parse", "refs/heads/chore/release-0.1.8"], f.remote)).toBe(advanced);
    expect(f.publications).toEqual([]);
  }, 20_000);

  it("refuses an existing branch without a PR instead of replacing it", async () => {
    const f = await fixture();
    f.git(["update-ref", "refs/heads/chore/release-0.1.8", f.initialHead], f.remote);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.errors.at(-1)).toContain("already exists without a matching PR");
    expect(f.phaseDirectories).toEqual([]);
    expect(f.publications).toEqual([]);
  });

  it.each([true, false])("verifies a previously prepared stable source before an exact-target retry (verified=%s)", async verified => {
    const f = await fixture("0.1.8");
    if (!verified) f.setAssociations([]);
    expect(await main(["0.1.8"], f.runtime)).toBe(verified ? 0 : 1);
    if (verified) {
      expect(f.publications).toEqual([{ source: f.initialHead, version: "0.1.8" }]);
      expect(f.pulls.map(pull => pull.headRefName)).toEqual(["chore/release-0.1.9-dev"]);
    } else {
      expect(f.publications).toEqual([]);
      expect(f.errors.at(-1)).toContain("no unique verified merged develop PR");
    }
  }, 20_000);

  it.each(["dirty", "branch", "behind", "lock"])("checks preflight before preparing PRs: %s", async failure => {
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
    let checks = 0;
    f.setRegistry(() => {
      checks += 1;
      if (checks === 2) {
        const base = f.git(["rev-parse", "refs/heads/develop"], f.remote);
        const tree = f.git(["rev-parse", `${base}^{tree}`], f.remote);
        const tip = f.git(["commit-tree", tree, "-p", base, "-m", "advance during registry check"], f.remote);
        f.git(["update-ref", "refs/heads/develop", tip], f.remote);
      }
      return null;
    });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.publications).toEqual([]);
    expect(f.errors.at(-1)).toContain("refusing to substitute another commit");
  }, 20_000);

  it("rejects a changed authoritative source rather than publishing an unrelated new tip", async () => {
    const f = await fixture();
    f.setWait(() => {
      const merged = f.manualMerge();
      const tree = f.git(["rev-parse", `${merged}^{tree}`], f.remote);
      const newer = f.git(["commit-tree", tree, "-p", merged, "-m", "unrelated follow-up"], f.remote);
      f.git(["update-ref", "refs/heads/develop", newer], f.remote);
    });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.errors.join("\n")).toContain("refusing to substitute another commit");
    expect(f.publications).toEqual([]);
  }, 20_000);
});
