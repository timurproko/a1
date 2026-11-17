import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { describe, expect, it, vi } from "vitest";
import { promotePublishedPair } from "../../scripts/release/npm-promote-pair.mjs";

const packages = ["@timurproko/a1", "@timurproko/a1-install"].map(name => ({ name, integrity: "sha512-validated", shasum: "a".repeat(40) }));
const version = "0.2.7-dev.1308";
function fixture() {
  const tags = new Map(packages.map(package_ => [package_.name, "0.2.7-dev.1305"]));
  const writes: string[] = [];
  let refused: string | null = null;
  const fetch = vi.fn(async (input: string | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (url.startsWith("https://oidc.example")) return Response.json({ value: "identity-token" });
    const name = [...packages].reverse().find(package_ => decodeURIComponent(url).includes(package_.name))?.name;
    if (!name) throw new Error("unexpected package");
    if (url.includes("/exchange/package/")) return Response.json({ token: `token-for-${name}` });
    if (init?.method === "PUT") {
      expect(init.redirect).toBe("error");
      expect((init.headers as Record<string, string>).authorization).toBe(`Bearer token-for-${name}`);
      if (refused === name) return Response.json({}, { status: 403 });
      writes.push(name);
      tags.set(name, JSON.parse(String(init.body)) as string);
      return Response.json({});
    }
    return Response.json({ next: tags.get(name) });
  });
  const verify = vi.fn(async () => ({ version, channel: "next" as const, packages: packages.map(package_ => package_.name) }));
  const input = { packages, version, channel: "next" as const, smokeResult: "success", fetch, verify,
    environment: { GITHUB_WORKFLOW_REF: "timurproko/a1/.github/workflows/publish.yml@refs/heads/develop", ACTIONS_ID_TOKEN_REQUEST_URL: "https://oidc.example/token", ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token" },
  };
  return { input, tags, writes, refuse: (name: string | null) => { refused = name; } };
}

describe("exercised npm channel promotion", () => {
  it.each(["failure", "cancelled", "skipped", ""])("never contacts npm after %s smoke", async smokeResult => {
    const { input } = fixture();
    await expect(promotePublishedPair({ ...input, smokeResult })).rejects.toThrow(/smoke/u);
    expect(input.fetch).not.toHaveBeenCalled();
    expect(input.verify).not.toHaveBeenCalled();
  });
  it("checks bytes before writes and public tags after installer-first promotion", async () => {
    const { input, writes } = fixture();
    await promotePublishedPair(input);
    expect(writes).toEqual([packages[1]!.name, packages[0]!.name]);
    expect(input.verify).toHaveBeenNthCalledWith(1, expect.objectContaining({ requireTag: false }));
    expect(input.verify).toHaveBeenNthCalledWith(2, expect.objectContaining({ requireTag: true }));
  });
  it("does not mutate any tag if byte verification fails", async () => {
    const { input, writes } = fixture();
    input.verify.mockRejectedValueOnce(new Error("wrong bytes"));
    await expect(promotePublishedPair(input)).rejects.toThrow(/wrong bytes/u);
    expect(writes).toEqual([]);
  });
  it("reconciles a partial promotion without repeating the successful write", async () => {
    const { input, writes, refuse } = fixture();
    refuse(packages[0]!.name);
    await expect(promotePublishedPair(input)).rejects.toThrow(/Allow npm dist-tag/u);
    expect(writes).toEqual([packages[1]!.name]);
    refuse(null);
    await promotePublishedPair(input);
    expect(writes).toEqual([packages[1]!.name, packages[0]!.name]);
  });
  it("refuses to downgrade a public tag", async () => {
    const { input, tags, writes } = fixture();
    tags.set(packages[0]!.name, "0.2.7-dev.9999");
    await expect(promotePublishedPair(input)).rejects.toThrow(/newer/u);
    expect(writes).toEqual([]);
  });
  it("bounds published-pair jobs and smoke steps while retaining unconditional evidence upload", async () => {
    const workflow = parse(await readFile(".github/workflows/publish.yml", "utf8"));
    const smoke = workflow.jobs.post_publish;
    expect(smoke["timeout-minutes"]).toBe(30);
    const exercise = smoke.steps.find((step: { run?: string }) => step.run === "node scripts/release/smoke-published-installer.mjs");
    expect(exercise["timeout-minutes"]).toBe(25);
    // Rationale: acquisition + fresh install + predecessor install + update + repair can consume 19 minutes.
    expect(exercise["timeout-minutes"]).toBeGreaterThan(2 + 5 + 5 + 2 + 5);
    expect(smoke["timeout-minutes"]).toBeGreaterThan(exercise["timeout-minutes"]);
    expect(exercise["continue-on-error"]).toBeUndefined();
    const upload = smoke.steps.find((step: { name?: string }) => step.name === "Upload published-pair evidence");
    expect(smoke.steps.indexOf(upload)).toBeGreaterThan(smoke.steps.indexOf(exercise));
    expect(upload.if).toBe("always()");
    expect(upload.with["if-no-files-found"]).toBe("error");
  });
  it("keeps promotion behind every smoke lane and completion behind promotion", async () => {
    const workflow = parse(await readFile(".github/workflows/publish.yml", "utf8"));
    expect(workflow.concurrency).toEqual({ group: "a1-registry-publication", "cancel-in-progress": false });
    expect(workflow.jobs.promote.needs).toContain("post_publish");
    expect(workflow.jobs.promote.if).toContain("needs.post_publish.result == 'success'");
    expect(workflow.jobs.promote.permissions["id-token"]).toBe("write");
    expect(workflow.jobs.complete.needs).toContain("promote");
    expect(workflow.jobs.complete.if).toContain("needs.promote.result == 'success'");
    expect(workflow.jobs.result.needs).toContain("promote");
    expect(workflow.jobs.publish.if).not.toContain("outputs.build ==");
    expect(workflow.jobs.post_publish.if).not.toContain("outputs.build ==");
    const verification = workflow.jobs.publish.steps.find((step: { run?: string }) => step.run === "node scripts/release/npm-registry-verification.mjs");
    expect(verification.env.VERIFY_PUBLIC_TAG).toBe("false");
  });
});
