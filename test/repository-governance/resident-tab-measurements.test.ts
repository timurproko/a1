import { describe, expect, it } from "vitest";
import { findProcessedInput, summarizeResidentTabMeasurements } from "../../scripts/development/measure-resident-tabs.mjs";

/** The 23 input samples of one macOS run: the cold first input, then warm, reattach, and 20 hot inputs. */
function inputSamples(cold: number, hot: number): Record<string, number>[] {
  return [cold, ...Array.from({ length: 22 }, () => hot)].map(inputToProcessMs => ({ inputToProcessMs, outputToPresentMs: 1 }));
}

describe("resident tab latency measurements", () => {
  it("skips a stale line for the token that was stamped before the send", () => {
    const output = "measurement:s:1000\r\nmeasurement:t:1001\r\nmeasurement-ready:1500\r\nmeasurement:s:2000\r\n";

    expect(findProcessedInput(output, "s", 1999n)?.[1]).toBe("2000");
    expect(findProcessedInput(output, "t", 1999n)).toBeNull();
  });

  it("measures p95 over every sample, so one cold outlier stays within budget", () => {
    const { inputToProcessMs } = summarizeResidentTabMeasurements(inputSamples(94.9, 0.5), 2500).measurements;

    expect(inputToProcessMs).toMatchObject({ samples: 23, rejectedSamples: 0, p95Ms: 0.5, passed: true });
  });

  it("fails a metric that recorded a negative latency instead of dropping it", () => {
    const samples = inputSamples(0.5, 0.5);
    samples[4] = { inputToProcessMs: -6.6, outputToPresentMs: 1 };

    const { inputToProcessMs, outputToPresentMs } = summarizeResidentTabMeasurements(samples, 2500).measurements;

    expect(inputToProcessMs).toMatchObject({ samples: 22, rejectedSamples: 1, passed: false });
    expect(outputToPresentMs).toMatchObject({ samples: 23, rejectedSamples: 0, passed: true });
  });

  it("leaves metrics recorded only by the first sample unrejected", () => {
    const samples: Record<string, number>[] = inputSamples(0.5, 0.5);
    samples[0] = { ...samples[0], coldLaunchMs: 165, warmCreateMs: 26 };

    const { coldLaunchMs, warmCreateMs } = summarizeResidentTabMeasurements(samples, 2500).measurements;

    expect(coldLaunchMs).toMatchObject({ samples: 1, rejectedSamples: 0, passed: true });
    expect(warmCreateMs).toMatchObject({ samples: 1, rejectedSamples: 0, passed: true });
  });
});
