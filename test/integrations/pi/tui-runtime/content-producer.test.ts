import { describe, it } from "vitest";
import { CONTENT_RENDERING_WORKLOADS } from "../../../support/rendering/content-workloads.js";
import { verifyScheduledContent } from "../../../support/rendering/content-producer-checks.js";

describe("source-faithful scheduled content producers", () => {
  it.each(CONTENT_RENDERING_WORKLOADS)("preserves intermediate and final content at $columns x $rows", verifyScheduledContent, 120_000);
});
