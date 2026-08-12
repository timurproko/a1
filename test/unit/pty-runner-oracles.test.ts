import { describe, expect, it } from "vitest";
import { HostControlOracle, waitForParsedCondition } from "../../src/test-harness/pty-runner.js";

describe("outer PTY host-control oracle regressions", () => {
  it("consumes controls once and never resurrects stale cursor state", () => {
    const oracle = new HostControlOracle();
    oracle.push("\x1b[?25h");
    oracle.push("frame cells");
    oracle.push("\x1b[?25l");
    expect(oracle.snapshot().cursorVisible).toBe(false);

    // Subsequent chunks contain no cursor command. A rolling-tail rescan used
    // to rediscover the stale earlier ?25h and report a false visible cursor.
    oracle.push("more frame cells");
    oracle.push("footer");
    expect(oracle.snapshot().cursorVisible).toBe(false);
  });

  it("retains only an incomplete CSI suffix across transport fragments", () => {
    const oracle = new HostControlOracle();
    oracle.push("prefix\x1b[?90");
    expect(oracle.snapshot().cursorVisible).toBe(true);
    oracle.push("01h\x1b[?25l");
    expect(oracle.snapshot()).toMatchObject({ win32InputMode: true, cursorVisible: false });
    oracle.push("plain output");
    expect(oracle.snapshot()).toMatchObject({ win32InputMode: true, cursorVisible: false });
  });

  it("measures visibility from output parse completion without polling full frames", async () => {
    let revision = 0;
    let visible = false;
    let waits = 0;
    await waitForParsedCondition(
      () => visible,
      {
        currentRevision: () => revision,
        waitForRevisionAfter: async observed => {
          waits += 1;
          expect(observed).toBe(0);
          visible = true;
          revision += 1;
        },
      },
      100,
    );
    expect(waits).toBe(1);
  });
});
