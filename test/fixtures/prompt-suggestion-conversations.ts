/** Synthetic prediction cases: no private screenshot, session, or project paths. */
export const ARCHIVE_OFFER = "Work accepted and merged; CI is green. Say archive it and I'll record acceptance and archive the completed change. Or, if you want an additional test first, say let me test and I'll wait.";

// Compatibility: Pi estimates context size from each assistant message's usage, so synthetic replies carry one.
export const SYNTHETIC_USAGE = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };

export const SUGGESTION_CONVERSATIONS = {
  archive: {
    expected: "archive it",
    messages: [
      { role: "user", content: "I tested it and accept it. Merge it.", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "I will merge the accepted work." }], stopReason: "stop", usage: SYNTHETIC_USAGE, timestamp: 2 },
      { role: "user", content: "yes merge it", timestamp: 3 },
      { role: "assistant", content: [{ type: "text", text: ARCHIVE_OFFER }], stopReason: "stop", usage: SYNTHETIC_USAGE, timestamp: 4 },
    ],
  },
  requiredTesting: {
    expected: null,
    messages: [
      { role: "user", content: "I require manual testing before closeout. I have not tested it yet.", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "Testing remains required before archival." }], stopReason: "stop", usage: SYNTHETIC_USAGE, timestamp: 2 },
      { role: "user", content: "wait for my test result", timestamp: 3 },
      { role: "assistant", content: [{ type: "text", text: "I will wait. After testing, you can say archive it." }], stopReason: "stop", usage: SYNTHETIC_USAGE, timestamp: 4 },
    ],
  },
  unresolved: {
    expected: null,
    messages: [
      { role: "user", content: "I have not decided which approach to use.", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "There are two viable approaches." }], stopReason: "stop", usage: SYNTHETIC_USAGE, timestamp: 2 },
      { role: "user", content: "tell me the choices", timestamp: 3 },
      { role: "assistant", content: [{ type: "text", text: "Use a local database or a remote service? Neither is preferred without your decision." }], stopReason: "stop", usage: SYNTHETIC_USAGE, timestamp: 4 },
    ],
  },
} as const;
