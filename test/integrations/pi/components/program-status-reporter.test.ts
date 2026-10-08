import type { ProgramStatus } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { ProgramStatusReporter } from "../../../../src/integrations/pi/components/upstream/program-status-reporter.js";

describe("ProgramStatusReporter", () => {
  it("preserves pinned run outcomes, dialog priority, safe error text, session reset, and clear", () => {
    const statuses: ProgramStatus[] = [];
    let sessionName: string | undefined = "review";
    const reporter = new ProgramStatusReporter(status => statuses.push(status), () => sessionName);

    reporter.report();
    expect(statuses.at(-1)).toEqual({ state: "idle", app: "a1" });

    reporter.handleEvent({ type: "agent-run-started" } as never);
    expect(statuses.at(-1)).toEqual({ state: "working", message: "review", app: "a1" });

    reporter.setBlocked("dialog", { kind: "question", message: "Choose a model" });
    reporter.setBlocked("authentication", { kind: "auth", message: "Log in to OpenAI" });
    expect(statuses.at(-1)).toEqual({ state: "blocked", kind: "auth", message: "Log in to OpenAI", app: "a1" });
    reporter.setBlocked("authentication", undefined);
    expect(statuses.at(-1)).toEqual({ state: "blocked", kind: "question", message: "Choose a model", app: "a1" });
    reporter.setBlocked("dialog", undefined);

    reporter.setErrorMessage("Provider failed\nprivate response body");
    reporter.handleEvent({ type: "assistant-message-completed", successful: false } as never);
    reporter.handleEvent({ type: "agent-run-settled", successful: false, aborted: false } as never);
    expect(statuses.at(-1)).toEqual({ state: "error", message: "Provider failed", app: "a1" });

    reporter.handleEvent({ type: "agent-run-started" } as never);
    reporter.handleEvent({ type: "assistant-message-completed", successful: true } as never);
    reporter.handleEvent({ type: "agent-run-settled", successful: true, aborted: false } as never);
    expect(statuses.at(-1)).toEqual({ state: "done", message: "review", app: "a1" });

    reporter.handleEvent({ type: "agent-run-started" } as never);
    reporter.handleEvent({ type: "agent-run-settled", successful: false, aborted: true } as never);
    expect(statuses.at(-1)).toEqual({ state: "idle", app: "a1" });

    reporter.setBlocked("dialog", { kind: "question", message: "Old session" });
    sessionName = "next";
    reporter.reset();
    expect(statuses.at(-1)).toEqual({ state: "idle", app: "a1" });

    reporter.clear();
    reporter.clear();
    expect(statuses.at(-1)).toEqual({ state: "clear", app: "a1" });
    expect(statuses.filter(status => status.state === "clear")).toHaveLength(1);
  });
});
