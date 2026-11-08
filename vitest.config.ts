import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["test/support/pi-settings-metadata-setup.ts"],
    setupFiles: ["test/support/terminal-environment.ts", "test/support/pinned-module-resolver.ts"],
    include: ["test/**/*.test.ts"],
    sequence: { concurrent: false },
  },
});
