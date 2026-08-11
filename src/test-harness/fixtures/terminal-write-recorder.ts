import { appendFileSync } from "node:fs";

const evidencePath = process.env.ADDONE_TERMINAL_PROTOCOL_EVIDENCE;
const role = classifyRole(process.argv);

if (evidencePath && role === "pi") {
  const record = (direction: "child-output" | "child-input", chunk: unknown) => {
    try {
      const bytes = typeof chunk === "string"
        ? Buffer.from(chunk, "utf8")
        : Buffer.isBuffer(chunk)
          ? chunk
          : chunk instanceof Uint8Array
            ? Buffer.from(chunk)
            : Buffer.from(String(chunk), "utf8");
      appendFileSync(evidencePath, `${JSON.stringify({
        at: new Date().toISOString(),
        pid: process.pid,
        role,
        argv: process.argv,
        direction,
        length: bytes.length,
        dataBase64: bytes.toString("base64"),
      })}\n`);
    } catch {
      // Diagnostic recording must never alter the observed terminal process.
    }
  };

  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string | Uint8Array, ...arguments_: unknown[]) => {
    record("child-output", chunk);
    return Reflect.apply(originalWrite, process.stdout, [chunk, ...arguments_]);
  }) as typeof process.stdout.write;

  process.stdin.on("data", chunk => record("child-input", chunk));
}

function classifyRole(argv: readonly string[]): "pi" | "other" {
  const command = argv.join("/").toLowerCase();
  return command.includes("pi-coding-agent") || /(?:^|\/)pi(?:\.js)?(?:$|\/)/.test(command) ? "pi" : "other";
}
