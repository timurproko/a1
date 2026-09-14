import { spawn } from "node:child_process";
import { createServer, type Socket } from "node:net";
import { expect, it } from "vitest";
import { runPredecessorCommand } from "../../support/predecessor-command.js";

it("cancels the live owned process tree while preserving an unrelated process", async ({ signal }) => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const sockets: Socket[] = [];
  const closed: Promise<void>[] = [];
  const roles = new Set<string>();
  let ready!: () => void;
  const readyPromise = new Promise<void>(resolve => { ready = resolve; });
  const server = createServer(socket => {
    sockets.push(socket);
    closed.push(new Promise(resolve => socket.once("close", resolve)));
    socket.on("error", () => socket.destroy());
    let data = "";
    socket.on("data", chunk => {
      data += chunk.toString();
      if (data.includes("\n")) roles.add(data.trim());
      if (roles.has("root") && roles.has("descendant")) ready();
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing fixture address");
  const unrelated = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], { stdio: "ignore" });
  const unrelatedClosed = new Promise<void>(resolve => unrelated.once("close", () => resolve()));
  const unrelatedError = Promise.withResolvers<never>();
  unrelated.once("error", unrelatedError.reject);
  const connection = (role: string) => `const socket=require('node:net').connect(${address.port},'127.0.0.1',()=>socket.write('${role}\\n'));
    socket.on('error',()=>process.exit(77));
    // Failure containment only; a watchdog exit cannot satisfy the successful cancellation assertion.
    setTimeout(()=>process.exit(76),10000).unref();`;
  const descendant = connection("descendant");
  const root = `${connection("root")} require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:['ignore','inherit','inherit']});`;
  const outcome = runPredecessorCommand({ executable: process.execPath, arguments: ["-e", root], cwd: process.cwd(), phase: "cancel-tree", signal: controller.signal })
    .then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
  try {
    await Promise.race([readyPromise, unrelatedError.promise, outcome.then(() => { throw new Error("owned tree closed before handshake"); })]);
    controller.abort();
    const result = await outcome;
    expect(result.error).toMatchObject({ evidence: { error: "ABORTED", cleanupError: null } });
    await Promise.all(closed);
    expect(unrelated.exitCode).toBeNull();
    expect(unrelated.signalCode).toBeNull();
  } finally {
    controller.abort(); await outcome;
    signal.removeEventListener("abort", abort);
    unrelated.kill("SIGKILL"); await unrelatedClosed;
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
