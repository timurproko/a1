import { describe, expect, it } from "vitest";
import { residentPredecessorBaseline } from "../../support/resident-predecessor.js";

const originalTabs = () => [0, 1, 2].map(index => ({
  tabId: `agent-${index}`,
  kind: "agent",
  incarnation: 1,
  holderPid: 100 + index,
  childPid: 200 + index,
  sessionFile: null as string | null,
}));
const publishedTabs = () => originalTabs().map(tab => ({ ...tab, sessionFile: `/sessions/${tab.tabId}.jsonl` }));

describe("published resident predecessor continuity baseline", () => {
  it("waits for the last original Agent's session publication after child startup", () => {
    const expected = originalTabs();
    const incomplete = publishedTabs().map((tab, index) => index === 2 ? { ...tab, sessionFile: null } : tab);
    expect(residentPredecessorBaseline(expected, expected)).toBeUndefined();
    expect(residentPredecessorBaseline(expected, incomplete)).toBeUndefined();
    const published = publishedTabs();
    expect(residentPredecessorBaseline(expected, published)).toBe(published);
    expect(published.every(tab => tab.sessionFile !== null)).toBe(true);
  });

  it("does not treat empty session metadata as readiness", () => {
    const current = publishedTabs();
    current[2]!.sessionFile = "";
    expect(residentPredecessorBaseline(originalTabs(), current)).toBeUndefined();
  });

  it.each(["missing", "extra", "duplicate", "foreign"] as const)("rejects a %s Agent set", shape => {
    const current = publishedTabs();
    if (shape === "missing") current.pop();
    if (shape === "extra") current.push({ ...current[0]!, tabId: "extra-agent" });
    if (shape === "duplicate") current[2]!.tabId = current[0]!.tabId;
    if (shape === "foreign") current[2]!.tabId = "replacement-agent";
    expect(residentPredecessorBaseline(originalTabs(), current)).toBeUndefined();
  });

  it.each(["incarnation", "holderPid", "childPid"] as const)("never rebaselines a changed %s while awaiting metadata", key => {
    const current = originalTabs();
    current[2]![key] += 1;
    expect(() => residentPredecessorBaseline(originalTabs(), current)).toThrow(`changed ${key}`);
  });

  it("rejects a changed Agent kind", () => {
    const current = publishedTabs();
    current[2]!.kind = "shell";
    expect(() => residentPredecessorBaseline(originalTabs(), current)).toThrow("changed kind");
  });

  it.each([null, "/sessions/replacement.jsonl"])("does not replace an already published session with %s", sessionFile => {
    const expected = publishedTabs();
    const current = expected.map(tab => ({ ...tab, sessionFile: tab.sessionFile as string | null }));
    current[0]!.sessionFile = sessionFile;
    expect(() => residentPredecessorBaseline(expected, current)).toThrow("changed session");
  });

  it("matches original identities by tab ID rather than adopting replacements by position", () => {
    const current = publishedTabs().reverse();
    expect(residentPredecessorBaseline(originalTabs(), current)).toBe(current);
  });
});
