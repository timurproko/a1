import type { EventFrameParityResult } from "./pi-event-frame-parity-fixture.js";

/** Describe the first structured divergence without weakening or dumping the full captured ANSI. */
export function eventFrameDifference(expected: EventFrameParityResult, actual: EventFrameParityResult): string | undefined {
  for (const kind of ["states", "frames"] as const) {
    const count = Math.max(expected[kind].length, actual[kind].length);
    for (let index = 0; index < count; index += 1) {
      const left = expected[kind][index];
      const right = actual[kind][index];
      const before = JSON.stringify(left) ?? "<absent>";
      const after = JSON.stringify(right) ?? "<absent>";
      if (before === after) continue;
      let offset = 0;
      while (offset < Math.min(before.length, after.length) && before[offset] === after[offset]) offset += 1;
      const start = Math.max(0, offset - 60);
      return `${kind}[${index}] stage=${left?.stage ?? right?.stage} serialized offset=${offset}`
        + `\nexpected: ${before.slice(start, offset + 120)}\nactual:   ${after.slice(start, offset + 120)}`;
    }
  }
  return undefined;
}
