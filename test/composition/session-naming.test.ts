import { describe, expect, it, vi } from "vitest";
import type { ComposedSessionBackend } from "../../src/composition/session-backend.js";
import type { OwnedSettingsManager } from "../../src/ui/settings/manager.js";

const observed = vi.hoisted(() => ({ imports: 0, constructed: 0, disposed: 0, enabled: undefined as (() => boolean) | undefined }));
vi.mock("../../src/features/session-naming/index.js", () => {
  observed.imports++;
  return { SessionNamingController: class {
    constructor(options: { enabled: () => boolean }) { observed.constructed++; observed.enabled = options.enabled; }
    settingsChanged() {}
    dispose() { observed.disposed++; }
  } };
});
import { bindAutomaticSessionNaming } from "../../src/composition/session-naming.js";

describe("profile-scoped naming loading", () => {
  it("does not load A1 naming for comparison or absent owners and awaits eligible binding", async () => {
    const missing = {} as ComposedSessionBackend;
    (await bindAutomaticSessionNaming(missing, null, false)).dispose();
    (await bindAutomaticSessionNaming(missing, null, true)).dispose();
    expect(observed.imports).toBe(0);
    let override: boolean | null = false;
    const backend = { identity: { currentSessionFile: () => "session.jsonl" }, naming: { state: () => ({ autoName: override }) } } as unknown as ComposedSessionBackend;
    const release = vi.fn();
    const settings = { value: () => true, onChange: () => release } as unknown as OwnedSettingsManager;
    const bound = await bindAutomaticSessionNaming(backend, settings, true);
    expect(observed.imports).toBe(1);
    expect(observed.constructed).toBe(1);
    expect(observed.enabled?.()).toBe(false);
    override = null; expect(observed.enabled?.()).toBe(true);
    bound.dispose(); bound.dispose();
    expect(observed.disposed).toBe(1);
    expect(release).toHaveBeenCalledOnce();
  });
});
