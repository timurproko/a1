import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reserveHerdrBinding, withHerdrBinding } from "../../../src/features/owned-ui/herdr-binding.js";

const systemTemp = vi.hoisted(() => ({ root: "" }));
vi.mock("node:os", async original => {
  const actual = await original<typeof import("node:os")>();
  return { ...actual, tmpdir: () => systemTemp.root || actual.tmpdir() };
});
let root = "", alias = "", physical = "";
const environment = { HC_TERMINAL_ID: "t5z" };
beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "herdr-binding-")));
  physical = join(root, "physical"); alias = join(root, "system-temp");
  await mkdir(physical);
  await symlink(physical, alias, process.platform === "win32" ? "junction" : "dir");
  systemTemp.root = alias;
});
afterEach(async () => { systemTemp.root = ""; await rm(root, { recursive: true, force: true }); });

describe("Herdr binding system temp boundary", () => {
  it("reserves through the OS-selected alias and keeps canonical generation fencing", async () => {
    const directory = join(alias, "bindings");
    const first = await reserveHerdrBinding(randomUUID(), environment, directory);
    expect(first).toMatchObject({ generation: 1 });
    expect(first!.file).toBe(join(physical, "bindings", first!.file.split(/[\\/]/u).at(-1)!));
    const second = await reserveHerdrBinding(randomUUID(), environment, join(physical, "bindings"));
    expect(second).toMatchObject({ generation: 2, file: first!.file });
    const stale = vi.fn(), current = vi.fn();
    await withHerdrBinding(first!, stale);
    await withHerdrBinding(second!, current);
    expect(stale).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
  });

  it("still rejects a caller-selected link below the OS temp root", async () => {
    const outside = join(root, "outside");
    await mkdir(outside);
    await symlink(outside, join(physical, "linked"), process.platform === "win32" ? "junction" : "dir");
    expect(await reserveHerdrBinding(randomUUID(), environment, join(alias, "linked", "bindings"))).toBeUndefined();
    expect(await readdir(outside)).toEqual([]);
  });

  it("does not treat an arbitrary alias as the OS-selected temp root", async () => {
    const arbitrary = join(root, "arbitrary");
    await symlink(physical, arbitrary, process.platform === "win32" ? "junction" : "dir");
    expect(await reserveHerdrBinding(randomUUID(), environment, join(arbitrary, "bindings"))).toBeUndefined();
    expect(await readdir(physical)).toEqual([]);
  });
});
