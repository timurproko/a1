import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { PINNED_DEFAULT_MODEL_BY_PROVIDER } from "../../../../src/integrations/pi/engine/workflow-support.js";

interface PinnedModelResolver {
  readonly defaultModelPerProvider: Readonly<Record<string, string>>;
}

const pinned = await import(pathToFileURL(resolve(
  "node_modules/@earendil-works/pi-coding-agent/dist/core/model-resolver.js",
)).href) as PinnedModelResolver;

describe("pinned workflow support", () => {
  it("mirrors every provider default used by the pinned Pi model resolver", () => {
    expect(PINNED_DEFAULT_MODEL_BY_PROVIDER).toEqual(pinned.defaultModelPerProvider);
  });
});
