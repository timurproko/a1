import { describe, expect, it } from "vitest";
import { runOwnedUi } from "../../../src/features/owned-ui/index.js";
import { TestOwnedUiApplication } from "./neutral-port-doubles.js";

describe("owned UI run", () => {
  it("starts, flushes, waits for, and disposes an injected neutral application", async () => {
    const application = new TestOwnedUiApplication();

    await expect(runOwnedUi({ application })).resolves.toBe(0);
    expect(application.calls).toEqual(["start", "flush", "wait", "dispose"]);
    expect(application.disposed).toBe(true);
  });

  it("always disposes after a bounded startup failure", async () => {
    const application = new TestOwnedUiApplication();
    application.flush = async () => { application.calls.push("flush"); throw new Error("synthetic flush failure"); };

    await expect(runOwnedUi({ application })).rejects.toThrow("synthetic flush failure");
    expect(application.calls).toEqual(["start", "flush", "dispose"]);
  });

  it("does not wait when the injected application reports itself disposed", async () => {
    const application = new TestOwnedUiApplication();
    application.flush = async () => { application.calls.push("flush"); application.disposed = true; };

    await expect(runOwnedUi({ application })).resolves.toBe(0);
    expect(application.calls).toEqual(["start", "flush", "dispose"]);
  });
});
