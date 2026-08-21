import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readEndpointMetadata } from "../../../src/foundation/release/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

describe("retained endpoint metadata compatibility", () => {
  it("normalizes pre-instance generation arrays only for safe cohort coordination", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-old-endpoint-"));
    roots.push(root);
    const path = resolve(root, "supervisor.json");
    await writeFile(path, JSON.stringify({
      schema: PRODUCT_IDENTITY.protocol.supervisorSchema,
      supervisorId: "supervisor-old",
      endpoint: "old-endpoint",
      pid: 1234,
      pidStartIdentity: "1234:start",
      bootNonce: "boot-old",
      releaseId: "release-old",
      releaseRoot: "D:/release-old",
      contentDigest: "a".repeat(64),
      ownership: {
        state: "busy",
        liveGenerationIds: ["legacy-generation"],
        nonResumableGenerationIds: ["legacy-generation"],
      },
    }));

    await expect(readEndpointMetadata(path)).resolves.toMatchObject({
      ownership: {
        state: "busy",
        liveInstanceIds: ["legacy-generation"],
        nonResumableInstanceIds: ["legacy-generation"],
        uncertainInstanceIds: [],
      },
    });
  });

  it("rejects metadata with neither plural nor retained ownership arrays", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-invalid-endpoint-"));
    roots.push(root);
    const path = resolve(root, "supervisor.json");
    await writeFile(path, JSON.stringify({
      schema: PRODUCT_IDENTITY.protocol.supervisorSchema,
      supervisorId: "supervisor",
      endpoint: "endpoint",
      pid: 1234,
      pidStartIdentity: "1234:start",
      bootNonce: "boot",
      releaseId: "release",
      releaseRoot: "D:/release",
      contentDigest: "b".repeat(64),
      ownership: { state: "busy" },
    }));
    await expect(readEndpointMetadata(path)).resolves.toBeNull();
  });
});
