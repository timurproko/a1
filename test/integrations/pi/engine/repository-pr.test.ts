import { describe, expect, it } from "vitest";
import { PRODUCT_IDENTITY } from "../../../../src/product-identity.js";
import { parseOpenPullRequest, readOpenPullRequest } from "../../../../src/integrations/pi/engine/repository-pr.js";

const payload = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  number: 540,
  url: "https://github.com/timurproko/a1/pull/540",
  state: "OPEN",
  headRefName: "feature/show-pr-id-status-bar",
  ...overrides,
});

describe("open pull request metadata", () => {
  it("accepts an exact open branch association and canonical GitHub URL", () => {
    expect(parseOpenPullRequest(payload(), "feature/show-pr-id-status-bar")).toEqual({
      number: 540,
      url: "https://github.com/timurproko/a1/pull/540",
    });
  });

  it("uses a validated development preview without invoking GitHub CLI", async () => {
    await expect(readOpenPullRequest(
      "ignored",
      "feature/show-pr-id-status-bar",
      new AbortController().signal,
      { [PRODUCT_IDENTITY.environment.prFooterPreview]: payload() },
    )).resolves.toEqual({ number: 540, url: "https://github.com/timurproko/a1/pull/540" });
  });

  it.each([
    ["malformed JSON", "{"],
    ["closed PR", payload({ state: "CLOSED" })],
    ["mismatched branch", payload({ headRefName: "other" })],
    ["nonpositive number", payload({ number: 0 })],
    ["wrong PR path", payload({ url: "https://github.com/timurproko/a1/pull/541" })],
    ["insecure URL", payload({ url: "http://github.com/timurproko/a1/pull/540" })],
    ["non-GitHub host", payload({ url: "https://example.com/timurproko/a1/pull/540" })],
    ["URL credentials", payload({ url: "https://user@github.com/timurproko/a1/pull/540" })],
    ["URL query", payload({ url: "https://github.com/timurproko/a1/pull/540?diff=split" })],
  ])("rejects %s", (_label, stdout) => {
    expect(parseOpenPullRequest(stdout, "feature/show-pr-id-status-bar")).toBeNull();
  });
});
