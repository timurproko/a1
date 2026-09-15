import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../../scripts/governance/openspec-acceptance-github.mjs";

describe("acceptance evidence concurrency", () => {
  it("awaits every item while respecting the declared bound and preserving result order", async () => {
    let active = 0;
    let maximum = 0;
    const completed: number[] = [];
    const result = await mapWithConcurrency(Array.from({ length: 17 }, (_, index) => index), 3, async value => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, value % 3));
      completed.push(value);
      active -= 1;
      return value * 2;
    });
    expect(maximum).toBe(3);
    expect(completed).toHaveLength(17);
    expect(result).toEqual(Array.from({ length: 17 }, (_, index) => index * 2));
  });

  it("awaits the remaining evidence before surfacing any rejection", async () => {
    const completed: number[] = [];
    await expect(mapWithConcurrency([0, 1, 2, 3, 4], 2, async value => {
      await new Promise(resolve => setTimeout(resolve, 1));
      completed.push(value);
      if (value === 1) throw new Error("stale evidence");
      return value;
    })).rejects.toThrow("stale evidence");
    expect(completed.sort((left, right) => left - right)).toEqual([0, 1, 2, 3, 4]);
    await expect(mapWithConcurrency([0], 1, async () => Promise.reject())).rejects.toBeUndefined();
  });
});
