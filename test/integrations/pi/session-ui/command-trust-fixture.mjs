import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { mkdir, rm, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Supplies filesystem inputs and observes raw trust effects, never expected UI output. */
export async function prepareCommandTrustFixture(home, entry, api) {
  if (entry.command !== "trust") return undefined;
  let cwd = home;
  if (entry.trust) {
    const target = join(home, "trust-target", "project");
    const alias = join(home, "trust-alias", "project");
    await mkdir(target, { recursive: true });
    await mkdir(dirname(alias), { recursive: true });
    await rm(alias, { recursive: true, force: true });
    await symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
    assert.equal(realpathSync(alias), realpathSync(target));
    assert.notEqual(realpathSync(dirname(alias)), dirname(realpathSync(target)));
    cwd = entry.trust.path === "alias" ? alias : realpathSync(target);
  }
  const canonical = realpathSync(cwd);
  const store = new api.ProjectTrustStore(join(home, "agent"));
  if (entry.trust) {
    store.set(join(home, "trust-unrelated"), false);
    const saved = entry.trust.saved;
    if (saved) store.set(saved === "parent" ? dirname(canonical) : saved === "ancestor" ? dirname(dirname(canonical)) : canonical, saved !== "denied");
  }
  const snapshot = () => {
    const path = join(home, "agent", "trust.json");
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  };
  const before = snapshot();
  const writes = [];
  const original = api.ProjectTrustStore.prototype.setMany;
  // Security: observe only this subprocess's temporary profile; retain the real store writer.
  api.ProjectTrustStore.prototype.setMany = function (updates) {
    writes.push(structuredClone(updates));
    return original.call(this, updates);
  };
  return {
    cwd,
    capture: settings => ({ before, after: snapshot(), writes, projectTrusted: settings.isProjectTrusted() }),
    restore: () => { api.ProjectTrustStore.prototype.setMany = original; },
  };
}
