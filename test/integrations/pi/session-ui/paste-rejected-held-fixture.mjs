// Concurrency: report acquisition failure but retain IPC so result rejection is distinct from process exit.
process.on("message", message => {
  if (message?.kind === "begin") process.send?.({ kind: "error", code: "paste-unavailable" });
});
process.on("disconnect", () => process.exit(0));
process.send?.({ kind: "ready" });
