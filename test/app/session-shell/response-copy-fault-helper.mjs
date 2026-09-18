// Security: synthetic transport failures never expose the user's clipboard.
process.send({ kind: "ready" });
process.on("message", message => {
  if (message.kind === "begin") {
    if (message.selection.start.column === 1) process.exit(1);
    if (message.selection.start.column === 2) { process.send({ kind: "unexpected" }); return; }
    const result = message.mode === "native"
      ? { outcome: "failed", failure: "unavailable" }
      : { outcome: "submitted-unverified" };
    process.send({ kind: "result", result, ...(message.mode === "terminal" ? { control: "\u001b]52;c;YWJj\u0007" } : {}) }, () => process.exit(0));
  }
});
