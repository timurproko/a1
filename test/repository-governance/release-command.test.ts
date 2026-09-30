import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { describe, expect, it, onTestFailed, onTestFinished } from "vitest";
import { prepareReopening } from "../../scripts/release/prepare-reopening.mjs";
import { main } from "../../scripts/release/release.mjs";
import { createReleaseRuntime } from "../../scripts/release/release-workflow.mjs";
import { createValidationPhaseRecorder } from "../../scripts/release/validation-phase.mjs";
import { NativeRegressionTrace } from "../support/native-regression-trace.js";
import { releaseFixture } from "../support/release-command-fixture.js";

const phases = createValidationPhaseRecorder("release-command-fixture");
const INTEGRATION_TIMEOUT = 45_000;
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

describe("default release runtime", () => {
  it("reports a failed preparation instead of crashing on the error writer", async () => {
    const written: string[] = [];
    const stderr = process.stderr.write;
    process.stderr.write = ((text: string) => { written.push(text); return true; }) as typeof process.stderr.write;
    try {
      expect(await main(["patch", "--approve"], createReleaseRuntime())).toBe(2);
    } finally {
      process.stderr.write = stderr;
    }
    expect(written.join("")).toMatch(/^\[release\] Usage: /u);
  });
});

async function prepare(f: Awaited<ReturnType<typeof fixture>>, target = "patch") {
  expect(await main([target], f.runtime)).toBe(0);
  expect(f.drafts).toHaveLength(1);
  return f.drafts[0]!;
}

function count(text: string, value: string) {
  return text.split(value).length - 1;
}
function editUrl(draft: { html_url: string }) {
  return draft.html_url.replace("/releases/tag/", "/releases/edit/");
}

describe("release preparation with real temporary Git and fake external services", () => {
  it.each([
    ["0.1.8-dev", "patch", "0.1.8", "0.1.9-dev"],
    ["0.1.8-dev", "minor", "0.2.0", "0.2.1-dev"],
    ["0.1.8-dev", "0.4.0", "0.4.0", "0.4.1-dev"],
  ])("prepares %s using %s as editable draft %s", async (current, target, stable, opening) => {
    const f = await fixture(current);
    const draft = await prepare(f, target);
    expect(draft).toMatchObject({ tag_name: `v${stable}`, name: `v${stable}`, target_commitish: f.initialHead, draft: true, prerelease: false });
    expect(draft.body).toMatch(new RegExp(`^## \\[${stable.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}`));
    expect(draft.body).toContain("### Changed");
    expect(draft.body).not.toContain(`# A1 ${stable}`);
    expect(await f.localVersion()).toBe(current);
    expect(f.logs[0]).toBe(`source ${current}; stable target ${stable}; next development ${opening}; mode prepare`);
    const output = f.logs.join("\n");
    expect(count(output, editUrl(draft))).toBe(1);
    expect(output).toContain("https://github.com/fixture/a1/actions/runs/42");
    expect(output).toContain("choose Publish release");
    expect(output).not.toContain("Save draft");
    expect(output).not.toContain("--approve");
    expect(f.events).toContain(`validation-dispatch:${f.initialHead}:${stable}`);
    expect(f.events.indexOf(`draft-create:v${stable}`)).toBeLessThan(f.events.indexOf(`validation-dispatch:${f.initialHead}:${stable}`));
    expect(f.ghCalls.some(args => args[0] === "pr")).toBe(false);
    // Invariant: the progress link comes first and the edit link only after validation passed; each stands alone on its line.
    const lines = output.split("\n");
    expect(lines).toContain("https://github.com/fixture/a1/actions/runs/42");
    expect(lines).toContain(editUrl(draft));
    expect(output.indexOf("actions/runs/42")).toBeLessThan(output.indexOf(editUrl(draft)));
    expect(f.events.indexOf("validation-wait:42")).toBeLessThan(f.events.lastIndexOf("log"));
  }, INTEGRATION_TIMEOUT);

  it("withholds the edit link when validation fails", async () => {
    const f = await fixture();
    f.setWaitForValidation(() => { throw new Error("publication run 42 failed in Validate linux-node24"); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toHaveLength(1);
    const draft = f.drafts[0]!;
    expect(f.logs.join("\n")).toContain("https://github.com/fixture/a1/actions/runs/42");
    expect(f.logs.join("\n")).not.toContain(editUrl(draft));
    expect(f.errors.join("\n")).toContain("failed in Validate linux-node24");
    expect(f.errors.join("\n")).toContain("The draft was not published");
  }, INTEGRATION_TIMEOUT);

  it("reuses an edited draft without overwriting it and reports the reused validation", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    draft.body = "## Fixes\n\n- Reviewed edit.\n";
    f.setDispatchValidation(() => ({ runId: 42, url: "https://github.com/fixture/a1/actions/runs/42", reused: true }));
    const before = f.logs.length;
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0]!.body).toBe("## Fixes\n\n- Reviewed edit.\n");
    const output = f.logs.slice(before).join("\n");
    expect(count(output, editUrl(draft))).toBe(1);
    expect(output).toContain("Following existing validation");
  }, INTEGRATION_TIMEOUT);

  it("refreshes a draft bound to an older develop in place instead of requiring its deletion", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    draft.body = "## Fixes\n\n- Edit for the superseded source.\n";
    const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
    const tip = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "fix after failed validation"], f.remote);
    f.git(["update-ref", "refs/heads/develop", tip, f.initialHead], f.remote);
    f.git(["pull", "-q", "--ff-only", "origin", "develop"]);
    const before = f.logs.length;
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0]).toMatchObject({ id: draft.id, tag_name: "v0.1.8", name: "v0.1.8", target_commitish: tip, draft: true, prerelease: false });
    expect(f.drafts[0]!.body).not.toContain("Edit for the superseded source.");
    expect(f.events.filter(event => event.startsWith("draft-create:"))).toHaveLength(1);
    expect(f.events.filter(event => event.startsWith("draft-update:"))).toHaveLength(1);
    const output = f.logs.slice(before).join("\n");
    expect(output).toContain(`Refreshed the v0.1.8 draft from ${f.initialHead.slice(0, 12)} to ${tip.slice(0, 12)}`);
    expect(count(output, editUrl(draft))).toBe(1);
  }, INTEGRATION_TIMEOUT);

  it("refuses to refresh a stale Release that is not a stable draft", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    draft.draft = false;
    const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
    const tip = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "advance"], f.remote);
    f.git(["update-ref", "refs/heads/develop", tip, f.initialHead], f.remote);
    f.git(["pull", "-q", "--ff-only", "origin", "develop"]);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts[0]!.target_commitish).toBe(f.initialHead);
    expect(f.events.some(event => event.startsWith("draft-update:"))).toBe(false);
    expect(f.errors.join("\n")).toContain("is not a replaceable stable draft");
  }, INTEGRATION_TIMEOUT);

  it("reports a validation dispatch failure after keeping the prepared draft", async () => {
    const f = await fixture();
    f.setDispatchValidation(() => { throw new Error("dispatch unavailable"); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toHaveLength(1);
    expect(f.errors.join("\n")).toContain("dispatch unavailable");
  }, INTEGRATION_TIMEOUT);

  it("rejects the retired local approval form before GitHub or registry mutation", async () => {
    const f = await fixture();
    expect(await main(["patch", "--approve"], f.runtime)).toBe(2);
    expect(f.drafts).toEqual([]);
    expect(f.events).toEqual([]);
    expect(f.errors.join("\n")).toContain("choosing Publish release on that draft publishes npm");
  }, INTEGRATION_TIMEOUT);

  it.each(["not-semver"])("rejects invalid current version %s", async version => {
    const f = await fixture(version);
    expect(await main(["patch"], f.runtime)).toBe(2);
    expect(f.drafts).toEqual([]);
  }, INTEGRATION_TIMEOUT);

  it.each(["0.1.8-dev.5"])("refuses non-open develop version %s", async version => {
    const f = await fixture(version);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
  }, INTEGRATION_TIMEOUT);

  it("rejects an explicit stable target below the open development core", async () => {
    const f = await fixture("0.2.2-dev");
    expect(await main(["0.2.1"], f.runtime)).toBe(2);
    expect(f.drafts).toEqual([]);
  }, INTEGRATION_TIMEOUT);

  it.each(["both", "application", "installer"])("refuses an existing stable npm identity: %s", async present => {
    const f = await fixture();
    f.setRegistry(name => present === "both" || (present === "application") === (name === f.manifest.name) ? { version: "0.1.8" } : null);
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
    expect(f.errors.join("\n")).toContain("stable versions are never republished");
  }, INTEGRATION_TIMEOUT);

  it.each(["dirty", "branch", "behind"])("checks preflight before draft mutation: %s", async failure => {
    const f = await fixture();
    if (failure === "dirty") await writeFile(`${f.cwd}/untracked.txt`, "preserve me");
    if (failure === "branch") f.git(["switch", "-c", "other"]);
    if (failure === "behind") {
      const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
      const tip = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "advance"], f.remote);
      f.git(["update-ref", "refs/heads/develop", tip, f.initialHead], f.remote);
    }
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
  }, INTEGRATION_TIMEOUT);

  it("refuses validation when develop advances while the draft is being prepared", async () => {
    const f = await fixture();
    f.setReleaseChanges(async () => {
      const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
      const tip = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "advance during preparation"], f.remote);
      f.git(["update-ref", "refs/heads/develop", tip, f.initialHead], f.remote);
      return [];
    });
    f.setDispatchValidation(() => { throw new Error("must not dispatch"); });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
    expect(f.errors.join("\n")).toContain("refusing to substitute another commit");
  }, INTEGRATION_TIMEOUT);

  it("rechecks authoritative source after asynchronous registry lookups", async () => {
    const f = await fixture();
    let advanced = false;
    f.setRegistry(() => {
      if (!advanced) {
        advanced = true;
        const tree = f.git(["rev-parse", `${f.initialHead}^{tree}`], f.remote);
        const tip = f.git(["commit-tree", tree, "-p", f.initialHead, "-m", "advance during registry"], f.remote);
        f.git(["update-ref", "refs/heads/develop", tip, f.initialHead], f.remote);
      }
      return null;
    });
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
    expect(f.errors.join("\n")).toContain("refusing to substitute another commit");
  }, INTEGRATION_TIMEOUT);

  it("rejects a draft whose notes are unsafe", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    draft.body = "<script>unsafe</script>";
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toHaveLength(1);
  }, INTEGRATION_TIMEOUT);

  it("keeps the edited draft for this source and removes duplicate drafts of the same version", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    draft.body = "## Fixes\n\n- Reviewed edit.\n";
    draft.updated_at = "2026-09-29T01:00:00Z";
    f.drafts.push(
      { ...draft, id: 2, body: "## Fixes\n\n- Older copy.\n", updated_at: "2026-09-28T00:00:00Z", html_url: "https://github.com/fixture/a1/releases/tag/untagged-2" },
      { ...draft, id: 3, tag_name: "untagged-87582e96", target_commitish: "a".repeat(40), html_url: "https://github.com/fixture/a1/releases/tag/untagged-87582e96" },
    );
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0]).toMatchObject({ id: draft.id, tag_name: "v0.1.8", body: "## Fixes\n\n- Reviewed edit.\n" });
    expect(f.events.filter(event => event.startsWith("draft-delete:"))).toEqual(["draft-delete:v0.1.8", "draft-delete:untagged-87582e96"]);
    expect(f.logs.join("\n")).toContain("Removed a duplicate v0.1.8 draft (untagged-87582e96, aaaaaaaaaaaa)");
  }, INTEGRATION_TIMEOUT);

  it("adopts an untagged draft of the same version instead of creating another", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    Object.assign(draft, { tag_name: "untagged-87582e96", target_commitish: "b".repeat(40) });
    const before = f.events.filter(event => event.startsWith("draft-create:")).length;
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0]).toMatchObject({ id: draft.id, tag_name: "v0.1.8", name: "v0.1.8", target_commitish: f.initialHead });
    expect(f.events.filter(event => event.startsWith("draft-create:"))).toHaveLength(before);
  }, INTEGRATION_TIMEOUT);

  it("refuses an existing target tag without moving or deleting it", async () => {
    const f = await fixture();
    f.tagTarget();
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
    expect(f.git(["rev-parse", "refs/tags/v0.1.8^{commit}"], f.remote)).toBe(f.initialHead);
    expect(f.errors.join("\n")).toContain("stable preparation never deletes, moves, or reuses a release tag");
  }, INTEGRATION_TIMEOUT);

  it("creates and exactly reuses one non-auto-merged reopening pull request", async () => {
    const f = await fixture();
    const markdown = "## [0.1.8] - 2026-09-28\n\n### Fixed\n\n- Exact reviewed note.\n";
    const noteFile = `${f.directory}/approved-note.md`;
    await writeFile(noteFile, markdown);
    const digest = createHash("sha256").update(markdown).digest("hex");
    let pull: Record<string, unknown> | null = null;
    const execute = (executable: string, args: readonly string[]) => {
      if (executable === "git") return f.git(args);
      if (args[0] === "pr" && args[1] === "list") return JSON.stringify(pull === null ? [] : [pull]);
      if (args[0] === "pr" && args[1] === "create") {
        const branch = args[args.indexOf("--head") + 1]!;
        const head = f.git(["rev-parse", `refs/heads/${branch}`], f.remote);
        pull = { number: 41, url: "https://example.test/pull/41", state: "OPEN", headRefName: branch,
          headRefOid: head, baseRefName: "develop", isCrossRepository: false, autoMergeRequest: null };
        return String(pull.url);
      }
      if (args[0] === "pr" && args[1] === "view") return JSON.stringify(pull);
      throw new Error(`unexpected reopening command: ${executable} ${args.join(" ")}`);
    };
    const options = { cwd: f.cwd, run: execute, releaseVersion: "0.1.8", source: f.initialHead, digest, noteFile };
    await expect(prepareReopening(options)).resolves.toMatchObject({ number: 41, opening: "0.1.9-dev", reused: false });
    const head = String(pull!.headRefOid);
    expect(f.git(["diff", "--name-only", f.initialHead, head], f.remote).split("\n").sort()).toEqual([
      "docs/releases/0.1.8.md", "package-lock.json", "package.json", "packages/a1-install/package.json",
    ]);
    expect(`${f.git(["show", `${head}:docs/releases/0.1.8.md`], f.remote)}\n`).toBe(markdown);
    await expect(prepareReopening(options)).resolves.toMatchObject({ number: 41, head, reused: true });
    pull!.autoMergeRequest = { enabledAt: "now" };
    await expect(prepareReopening(options)).rejects.toThrow(/unexpected or changed reopening pull request/);
  }, INTEGRATION_TIMEOUT);

});
