// Protocol: a minimal IPC helper that announces itself, echoes the first request, and exits when its channel closes.
process.on("disconnect", () => process.exit(0));
if (process.env.HELPER_POOL_FIXTURE === "crash") process.exit(3);
process.on("message", message => { if (message?.kind === "begin") process.send({ kind: "echo", pid: process.pid }); });
process.send({ kind: "ready" });
setInterval(() => {}, 1000);
