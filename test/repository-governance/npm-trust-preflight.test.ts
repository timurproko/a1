import { describe, expect, it } from "vitest";
import { assertTrustedPublishingNpm, callingWorkflow, proveTrustedPublishing } from "../../scripts/release/npm-trust-preflight.mjs";

const env = {
  GITHUB_WORKFLOW_REF: "timurproko/a1/.github/workflows/release.yml@refs/tags/v0.2.2",
  ACTIONS_ID_TOKEN_REQUEST_URL: "https://actions.example.test/token?api-version=2.0",
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
};
const packages = ["@timurproko/a1", "@timurproko/a1-install"];

function registry(refuse: readonly string[] = []) {
  const calls: string[] = [];
  const fetch = async (url: string | URL, init?: RequestInit) => {
    const target = String(url);
    calls.push(`${init?.method ?? "GET"} ${target}`);
    if (target.startsWith("https://actions.example.test/")) {
      expect(new URL(target).searchParams.get("audience")).toBe("npm:registry.npmjs.org");
      return Response.json({ value: "oidc-id-token" });
    }
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer oidc-id-token");
    const refused = refuse.some(name => target.endsWith(`/package/${name.replace("/", "%2f")}`));
    return refused ? Response.json({ message: "no trusted publisher" }, { status: 404 }) : Response.json({ token: "short-lived" });
  };
  return { calls, fetch };
}

describe("npm trusted-publishing preflight", () => {
  it("requires an npm CLI that performs the OIDC exchange", () => {
    expect(assertTrustedPublishingNpm("11.5.1\n")).toBe("11.5.1");
    expect(assertTrustedPublishingNpm("11.6.2")).toBe("11.6.2");
    expect(() => assertTrustedPublishingNpm("11.5.0")).toThrow(/npm >= 11\.5\.1 is required/u);
    expect(() => assertTrustedPublishingNpm("10.9.3")).toThrow(/trusted publishing/u);
  });

  it("names the calling workflow, not the reusable publisher", () => {
    expect(callingWorkflow(env.GITHUB_WORKFLOW_REF)).toEqual({ repository: "timurproko/a1", file: "release.yml" });
    expect(callingWorkflow("timurproko/a1/.github/workflows/develop.yml@refs/heads/develop").file).toBe("develop.yml");
    expect(() => callingWorkflow(undefined)).toThrow(/does not name a workflow file/u);
  });

  it("exchanges the job identity for both packages before any upload", async () => {
    const { calls, fetch } = registry();
    await expect(proveTrustedPublishing({ packages, env, fetch })).resolves.toEqual({ workflow: "release.yml", packages });
    expect(calls).toEqual([
      "GET https://actions.example.test/token?api-version=2.0&audience=npm%3Aregistry.npmjs.org",
      "POST https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/@timurproko%2fa1",
      "POST https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/@timurproko%2fa1-install",
    ]);
  });

  it("fails naming every refused package and the trusted publisher to register", async () => {
    const { fetch } = registry(["@timurproko/a1-install"]);
    const failure = proveTrustedPublishing({ packages, env, fetch });
    await expect(failure).rejects.toThrow("npm refused trusted publishing for @timurproko/a1-install (HTTP 404); nothing was uploaded");
    await expect(failure).rejects.toThrow("register release.yml (repository timurproko/a1, environment npm-publish) as a trusted publisher");
  });

  it("fails before contacting npm when the job has no OIDC identity", async () => {
    const { calls, fetch } = registry();
    await expect(proveTrustedPublishing({ packages, env: { ...env, ACTIONS_ID_TOKEN_REQUEST_TOKEN: undefined }, fetch }))
      .rejects.toThrow(/id-token: write/u);
    expect(calls).toEqual([]);
  });
});
