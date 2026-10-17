import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("process containment source boundary", () => {
  it("contains lifecycle methods but no terminal traffic surface", async () => {
    const source = await readFile("src/foundation/process-containment/contracts.ts", "utf8");
    expect(source).toContain("ProcessContainment");
    expect(source).not.toMatch(/stdin|stdout|stderr|terminal-input|terminal-output|dataBase64|framebuffer|parse|render|relay/i);
  });

  it("leaves Darwin N-API symbols for the hosting Node runtime", async () => {
    const build = await readFile("native/process-guardian/build.rs", "utf8");
    expect(build).toContain('target.contains("apple")');
    expect(build).toContain("cargo:rustc-link-arg=-Wl,dynamic_lookup");
    expect(build).not.toContain("cargo:rustc-link-arg-tests");
  });

  it("explicitly inherits Windows standard handles through CreateProcess", async () => {
    const source = await readFile("native/process-guardian/src/windows.rs", "utf8");
    expect(source).toContain("duplicate_standard_handle(STD_INPUT_HANDLE)");
    expect(source).toContain("duplicate_standard_handle(STD_OUTPUT_HANDLE)");
    expect(source).toContain("duplicate_standard_handle(STD_ERROR_HANDLE)");
    expect(source).toContain("startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES");
  });

  it("explicitly inherits Unix standard streams through posix_spawn", async () => {
    for (const path of ["native/process-guardian/src/linux.rs", "native/process-guardian/src/darwin.rs"]) {
      const source = await readFile(path, "utf8");
      expect(source).toContain("posix_spawn_file_actions_adddup2");
      expect(source).toContain("libc::F_DUPFD_CLOEXEC");
      expect(source).toContain("adddup2(&mut actions.value, source, destination)");
      expect(source).not.toContain("descriptor, descriptor");
      expect(source).toContain("libc::STDIN_FILENO");
      expect(source).toContain("libc::STDOUT_FILENO");
      expect(source).toContain("libc::STDERR_FILENO");
    }
  });
});
