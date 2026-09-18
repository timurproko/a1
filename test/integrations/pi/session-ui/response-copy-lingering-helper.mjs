// Concurrency: reports a complete prepared result and then lingers instead of exiting, without touching a real
// clipboard or terminal; the parent must reap it and still deliver the prepared text.
let text = "";
process.on("message", message => {
  if (message.kind === "row") { text += message.text; process.send({ kind: "ready" }); return; }
  if (message.kind === "begin") { process.send({ kind: "ready" }); return; }
  if (message.kind === "finish") {
    process.send({ kind: "phase", phase: "extracted", bytes: Buffer.byteLength(text, "utf8") });
    process.send({ kind: "data", text });
    return;
  }
  if (message.kind === "next") {
    process.send({ kind: "result", result: { outcome: "delivered" } });
    setInterval(() => {}, 1000);
  }
});
process.send({ kind: "ready" });
