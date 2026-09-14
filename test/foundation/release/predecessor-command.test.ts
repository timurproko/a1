import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { runPredecessorCommand } from "../../support/predecessor-command.js";

describe("predecessor command worker responsiveness", () => {
  it("services a parent/child handshake before the child can exit", async () => {
    const server = createServer(socket => { socket.on("error", () => socket.destroy()); socket.end("parent-responsive"); });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("missing fixture address");
      const result = await runPredecessorCommand({ executable: process.execPath, cwd: process.cwd(), phase: "handshake",
        arguments: ["--input-type=module", "-e", `
          import { connect } from 'node:net';
          // Failure containment only: success requires a parent response, not elapsed time.
          const watchdog = setTimeout(() => process.exit(75), 1000);
          const socket = connect(${address.port}, '127.0.0.1');
          socket.on('data', data => process.stdout.write(data));
          socket.on('end', () => clearTimeout(watchdog));
        `] });
      expect(result.stdout).toBe("parent-responsive");
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
