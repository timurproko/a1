import { chmod, cp, mkdir } from "node:fs/promises";

const source = new URL("../src/test-harness/fixtures/pi/", import.meta.url);
const target = new URL("../dist/src/test-harness/fixtures/pi/", import.meta.url);
await mkdir(target, { recursive: true });
await cp(new URL("pi", source), new URL("pi", target));
await cp(new URL("pi.cmd", source), new URL("pi.cmd", target));
await chmod(new URL("pi", target), 0o755);
