import { open, readdir } from "node:fs/promises";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { setImmediate } from "node:timers/promises";
import {
  createProgressObservationValidator,
  readProgressObservations,
} from "./resident-progress-observations.mjs";

/** Append-only live diagnostics; bounded parsing batches let the same process keep draining its PTY. */
export function createProgressObservationReader(directory, runId) {
  const cursors = new Map();
  const faults = new Set();
  const validate = createProgressObservationValidator(runId);
  let snapshot = { records: [], faults: [], files: [] };
  let pending;
  async function scan() {
    const names = (await readdir(directory))
      .filter((name) => name.endsWith(".jsonl"))
      .sort();
    const added = [];
    let buffer;
    for (const name of cursors.keys())
      if (!names.includes(name))
        faults.add(`${name}: observation file disappeared`);
    for (const name of names) {
      const file = await open(join(directory, name), "r");
      try {
        const stat = await file.stat();
        let cursor = cursors.get(name);
        if (!cursor) {
          cursor = {
            offset: 0,
            line: 0,
            tail: "",
            decoder: new StringDecoder("utf8"),
            dev: stat.dev,
            ino: stat.ino,
            modified: stat.mtimeMs,
          };
          cursors.set(name, cursor);
        } else if (
          cursor.dev !== stat.dev ||
          cursor.ino !== stat.ino ||
          stat.size < cursor.offset ||
          (stat.size === cursor.offset && cursor.modified !== stat.mtimeMs)
        ) {
          faults.add(`${name}: append-only observation file changed`);
          continue;
        }
        while (cursor.offset < stat.size) {
          buffer ??= Buffer.allocUnsafe(64 * 1024);
          const { bytesRead } = await file.read(
            buffer,
            0,
            Math.min(buffer.length, stat.size - cursor.offset),
            cursor.offset,
          );
          if (bytesRead === 0) {
            faults.add(`${name}: observation file shortened during read`);
            break;
          }
          cursor.offset += bytesRead;
          const lines = (
            cursor.tail + cursor.decoder.write(buffer.subarray(0, bytesRead))
          ).split("\n");
          cursor.tail = lines.pop() ?? "";
          const batch = [];
          for (const line of lines) {
            cursor.line++;
            if (!line.trim()) continue;
            try {
              batch.push(JSON.parse(line));
            } catch (error) {
              faults.add(
                `${name}:${cursor.line}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
          added.push(...batch);
          for (const fault of validate(batch)) faults.add(fault);
          // Concurrency: observation parsing must not block native terminal drainage through a growing history.
          await setImmediate();
        }
        cursor.modified = stat.mtimeMs;
      } catch (error) {
        faults.add(`${name}: observation read failed`);
        throw error;
      } finally {
        await file.close();
      }
    }
    if (
      added.length ||
      names.join("\0") !== snapshot.files.join("\0") ||
      faults.size !== snapshot.faults.length
    ) {
      snapshot = {
        records: [...snapshot.records, ...added].sort(
          (left, right) =>
            left.timestampUnixUs - right.timestampUnixUs ||
            String(left.processInstance).localeCompare(
              String(right.processInstance),
            ) ||
            left.sequence - right.sequence,
        ),
        faults: [...faults],
        files: names,
      };
    }
    return snapshot;
  }
  return () =>
    (pending ??= scan().finally(() => {
      pending = undefined;
    }));
}

/** Audit the entire log independently after measured windows end; caching cannot hide a lost or changed record. */
export async function readVerifiedProgressObservations(
  directory,
  runId,
  reader,
) {
  const cached = await reader();
  const complete = await readProgressObservations(directory, runId);
  const faults = new Set([...cached.faults, ...complete.faults]);
  const key = (value) =>
    `${value.role}:${value.pid}:${value.processInstance}:${value.sequence}`;
  const full = new Map(
    complete.records.map((value) => [key(value), JSON.stringify(value)]),
  );
  for (const value of cached.records) {
    if (full.get(key(value)) !== JSON.stringify(value))
      faults.add("live observation history changed before final validation");
  }
  return { ...complete, faults: [...faults] };
}
