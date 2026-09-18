// Concurrency: deliberately blocks native/CPU work, without accessing a real clipboard or terminal.
process.on("message", () => { for (;;) { /* Concurrency: the parent must terminate this process, not await a promise. */ } });
process.send({ kind: "ready" });
