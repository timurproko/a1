import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["test/support/pinned-module-resolver.ts"],
    include: ["test/**/*.test.ts"],
    sequence: { concurrent: false },
  },
});
