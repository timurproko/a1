import {
  appendFile,
  mkdir,
  mkdtemp,
  rm,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  createProgressObservationReader,
  readVerifiedProgressObservations,
} from "../../../scripts/development/resident-progress-reader.mjs";
import { readProgressObservations } from "../../../scripts/development/resident-progress-observations.mjs";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "progress-reader-"));
  roots.push(root);
  return {
    root,
    file: join(root, "native.jsonl"),
    read: createProgressObservationReader(root, "run"),
  };
}
function record(sequence: number) {
  return {
    schema: "a1-resident-progress-observation-v1",
    runId: "run",
    role: "holder",
    stage: "holder-commit",
    pid: 42,
    processInstance: "holder-42",
    timestampUnixUs: 1_000_000 + sequence * 1_000,
    clockErrorUs: 1000,
    sequence,
    tabId: "tab-a",
    incarnation: 1,
    eventSequence: sequence,
    revision: sequence,
    geometryGeneration: 0,
    bytes: 1,
    count: 1,
    lostBefore: 0,
  };
}
const line = (sequence: number) => `${JSON.stringify(record(sequence))}\n`;

describe("live progress observation reader", () => {
  it("reads only appended records and keeps prior snapshots and parsed objects unchanged", async () => {
    const f = await fixture();
    await writeFile(f.file, line(1));
    const first = await f.read();
    expect(first.faults).toEqual([]);
    expect(await f.read()).toBe(first);
    await appendFile(f.file, line(2));
    const second = await f.read();
    expect(second.records).toHaveLength(2);
    expect(first.records).toHaveLength(1);
    expect(second.records[0]).toBe(first.records[0]);
    expect(
      await readVerifiedProgressObservations(f.root, "run", f.read),
    ).toEqual(await readProgressObservations(f.root, "run"));
  });
  it("accepts a metadata-only timestamp update after verifying the consumed bytes", async () => {
    const f = await fixture();
    await writeFile(f.file, line(1));
    const first = await f.read();
    const later = new Date(Date.now() + 60_000);
    await utimes(f.file, later, later);
    const second = await f.read();
    expect(second).toBe(first);
    expect(second.faults).toEqual([]);
  });
  it("fails closed when consumed bytes change without changing file length", async () => {
    const f = await fixture();
    await writeFile(f.file, line(1));
    await f.read();
    const changed = `${JSON.stringify({ ...record(1), count: 2 })}\n`;
    expect(Buffer.byteLength(changed)).toBe(Buffer.byteLength(line(1)));
    await writeFile(f.file, changed);
    const later = new Date(Date.now() + 60_000);
    await utimes(f.file, later, later);
    expect((await f.read()).faults).toContain(
      "native.jsonl: append-only observation file changed",
    );
  });
  it("retains a partial record until its newline and preserves split UTF-8", async () => {
    const f = await fixture();
    const bytes = Buffer.from(
      `${JSON.stringify({ ...record(1), tabId: "tab-\u754c" })}\n`,
    );
    const split = bytes.indexOf(Buffer.from("\u754c")) + 1;
    await writeFile(f.file, bytes.subarray(0, split));
    expect((await f.read()).records).toEqual([]);
    await appendFile(f.file, bytes.subarray(split, bytes.length - 1));
    expect((await f.read()).records).toEqual([]);
    await appendFile(f.file, "\n");
    expect((await f.read()).records[0]!.tabId).toBe("tab-\u754c");
    expect((await f.read()).faults).toEqual([]);
  });
  it("validates sequence, loss and clock boundaries across appended batches", async () => {
    const f = await fixture();
    await writeFile(f.file, line(2));
    await f.read();
    await appendFile(
      f.file,
      `${JSON.stringify({ ...record(1), lostBefore: 1, timestampUnixUs: 1 })}\n`,
    );
    const result = await f.read();
    expect(result.faults.join("\n")).toContain(
      "duplicate or reordered process sequence",
    );
    expect(result.faults.join("\n")).toContain("process clock moved backwards");
    expect(result.faults.join("\n")).toContain("observations lost");
    expect(
      await readVerifiedProgressObservations(f.root, "run", f.read),
    ).toEqual(await readProgressObservations(f.root, "run"));
  });
  it("retains malformed-line failures while continuing to read complete valid records", async () => {
    const f = await fixture();
    await writeFile(f.file, "broken\n");
    await f.read();
    await appendFile(f.file, line(1));
    const result = await readVerifiedProgressObservations(
      f.root,
      "run",
      f.read,
    );
    expect(result.records).toHaveLength(1);
    expect(result.faults.join("\n")).toContain("invalid JSON");
  });
  it("fails closed when an observed file disappears or is truncated", async () => {
    const f = await fixture();
    await writeFile(f.file, line(1));
    await f.read();
    await writeFile(f.file, "");
    expect((await f.read()).faults.join("\n")).toContain(
      "append-only observation file changed",
    );
    await unlink(f.file);
    const result = await readVerifiedProgressObservations(
      f.root,
      "run",
      f.read,
    );
    expect(result.faults.join("\n")).toContain("observation file disappeared");
    expect(result.faults.join("\n")).toContain(
      "live observation history changed",
    );
  });
  it("independently audits cached history against the full log even when a rewritten prefix grows", async () => {
    const f = await fixture();
    await writeFile(f.file, line(1));
    await f.read();
    const changed = `${JSON.stringify({ ...record(1), count: 2 })}\n`;
    expect(Buffer.byteLength(changed)).toBe(Buffer.byteLength(line(1)));
    await writeFile(f.file, changed + line(2));
    const result = await readVerifiedProgressObservations(
      f.root,
      "run",
      f.read,
    );
    expect(result.faults).toContain(
      "live observation history changed before final validation",
    );
  });
  it("yields between bounded parsing batches while preserving exhaustive records", async () => {
    const f = await fixture();
    await writeFile(
      f.file,
      Array.from({ length: 2000 }, (_, index) => line(index + 1)).join(""),
    );
    let active = true;
    let turns = 0;
    const heartbeat = () => {
      turns++;
      if (active) setImmediate(heartbeat);
    };
    setImmediate(heartbeat);
    try {
      const result = await f.read();
      expect(result.records).toHaveLength(2000);
      expect(result.faults).toEqual([]);
      expect(turns).toBeGreaterThan(4);
      expect(result).toEqual(await readProgressObservations(f.root, "run"));
    } finally {
      active = false;
    }
  });
  it("coalesces concurrent scans without duplicating records and recovers from an absent directory", async () => {
    const f = await fixture();
    const directory = join(f.root, "later");
    const read = createProgressObservationReader(directory, "run");
    await expect(read()).rejects.toMatchObject({ code: "ENOENT" });
    await mkdir(directory);
    await writeFile(join(directory, "native.jsonl"), line(1));
    const first = read();
    const second = read();
    expect(first).toBe(second);
    expect((await first).records).toHaveLength(1);
    expect((await second).records).toHaveLength(1);
  });
});
