import { after } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Security: real cleanup exclusion in these fixtures must never read or mutate the user's runtime claim namespace.
const previous = process.env.A1_DATA_DIR, directory = await mkdtemp(join(tmpdir(), "cleanup-claim-fixture-"));
process.env.A1_DATA_DIR = directory;
after(async () => {
  if (previous === undefined) delete process.env.A1_DATA_DIR; else process.env.A1_DATA_DIR = previous;
  await rm(directory, { recursive: true, force: true, maxRetries: 5 });
});
