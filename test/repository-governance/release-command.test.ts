import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { describe, expect, it, onTestFailed, onTestFinished } from "vitest";
import { prepareReopening } from "../../scripts/release/prepare-reopening.mjs";
import { main } from "../../scripts/release/release.mjs";
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
    expect(count(output, "https://github.com/fixture/a1/actions/workflows/approve-release.yml")).toBe(1);
    expect(output).not.toContain("--approve");
    expect(f.ghCalls.some(args => args[0] === "pr")).toBe(false);
  }, INTEGRATION_TIMEOUT);

  it("reuses an edited draft without overwriting it and prints both links once per invocation", async () => {
    const f = await fixture();
    const draft = await prepare(f);
    draft.body = "## Fixes\n\n- Reviewed edit.\n";
    const before = f.logs.length;
    expect(await main(["patch"], f.runtime)).toBe(0);
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0]!.body).toBe("## Fixes\n\n- Reviewed edit.\n");
    const output = f.logs.slice(before).join("\n");
    expect(count(output, editUrl(draft))).toBe(1);
    expect(count(output, "actions/workflows/approve-release.yml")).toBe(1);
  }, INTEGRATION_TIMEOUT);

  it("rejects the retired local approval form before GitHub or registry mutation", async () => {
    const f = await fixture();
    expect(await main(["patch", "--approve"], f.runtime)).toBe(2);
    expect(f.drafts).toEqual([]);
    expect(f.events).toEqual([]);
    expect(f.errors.join("\n")).toContain("Approve stable release workflow in GitHub Actions");
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

  it.each(["both"])("refuses an existing stable npm identity: %s", async present => {
    const f = await fixture();
    f.setRegistry(() => present === "both" ? { version: "0.1.8" } : null);
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

  it.each(["unsafe", "ambiguous"])("rejects conflicting Release authority: %s", async kind => {
    const f = await fixture();
    const draft = await prepare(f);
    if (kind === "ambiguous") f.drafts.push({ ...draft, id: 2, html_url: "https://github.com/fixture/a1/releases/tag/untagged-2" });
    else draft.body = "<script>unsafe</script>";
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toHaveLength(kind === "ambiguous" ? 2 : 1);
  }, INTEGRATION_TIMEOUT);

  it("creates a fresh recovery draft from an ancestor orphan tag without moving it", async () => {
    const f = await fixture();
    f.tagTarget();
    const currentDevelop = await f.advanceDevelop();
    let selectedBase = "";
    f.setReleaseChanges(async (base, source) => {
      selectedBase = base;
      expect(source).toBe(f.initialHead);
      return [{ number: 17, title: "fix: recovered notes", url: "https://example.test/pull/17" }];
    });
    const draft = await prepare(f);
    expect(selectedBase).toBe(f.baselineHead);
    expect(draft.target_commitish).toBe(f.initialHead);
    expect(draft.body).toContain("recovered notes");
    expect(f.git(["rev-parse", "refs/heads/develop"], f.remote)).toBe(currentDevelop);
    expect(f.git(["rev-parse", "refs/tags/v0.1.8^{commit}"], f.remote)).toBe(f.initialHead);
    expect(f.logs.join("\n")).toContain("Draft release ready for editing");
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

  it.each(["latest-mismatch", "master-mismatch", "tag-mismatch"])("refuses ambiguous orphan-tag recovery: %s", async kind => {
    const f = await fixture();
    if (kind === "tag-mismatch") {
      f.git(["tag", "v0.1.8", f.baselineHead]);
      f.git(["push", "origin", "refs/tags/v0.1.8"]);
    } else {
      f.tagTarget();
      if (kind === "latest-mismatch") f.setRegistryTag(name => ({ version: name === f.manifest.name ? "0.1.7" : "0.1.6" }));
      if (kind === "master-mismatch") f.setMaster("a".repeat(40));
    }
    expect(await main(["patch"], f.runtime)).toBe(1);
    expect(f.drafts).toEqual([]);
  }, INTEGRATION_TIMEOUT);
});
