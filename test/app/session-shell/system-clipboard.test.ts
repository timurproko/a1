import { beforeEach, describe, expect, it, vi } from "vitest";

/** The native binding the reader loads; each case installs the image it reports. */
const native = vi.hoisted(() => ({
  availableFormats: (): string[] => [],
  hasImage: (): boolean => false,
  getImageBinary: undefined as (() => Promise<readonly number[]>) | undefined,
  getImageBase64: undefined as (() => Promise<string>) | undefined,
  getText: async (): Promise<string> => "",
  setText: async (_text: string): Promise<void> => {},
}));
// Invariant: the binding loads once per module, so it delegates to whatever the current case installed.
vi.mock("@mariozechner/clipboard", () => {
  const binding = {
    availableFormats: () => native.availableFormats(),
    hasImage: () => native.hasImage(),
    getImageBinary: async () => { if (native.getImageBinary === undefined) throw new Error("no binary reader"); return await native.getImageBinary(); },
    getImageBase64: async () => { if (native.getImageBase64 === undefined) throw new Error("no base64 reader"); return await native.getImageBase64(); },
    getText: () => native.getText(),
    setText: (text: string) => native.setText(text),
  };
  return { default: binding, ...binding };
});
// Rationale: with no image the reader falls back to platform commands; they report an empty clipboard here.
vi.mock("node:child_process", () => ({
  execFile: (_command: string, _args: readonly string[], _options: object, callback: (error: Error | null, stdout: string) => void) => {
    callback(new Error("no platform clipboard in tests"), "");
  },
}));

const { readSystemClipboardContent } = await import("../../../src/app/session-shell/system-clipboard.js");

function installImage(image: { readonly binary?: readonly number[]; readonly base64?: string } | null): { readonly base64: ReturnType<typeof vi.fn> } {
  const base64 = vi.fn(async () => image?.base64 ?? "");
  native.hasImage = () => image !== null;
  native.getImageBinary = image?.binary === undefined ? undefined : async () => image.binary!;
  native.getImageBase64 = image?.base64 === undefined ? undefined : base64;
  return { base64 };
}

beforeEach(() => { installImage(null); });

describe("system clipboard images", () => {
  it("prefers binary bytes and emits padded PNG base64", async () => {
    const { base64 } = installImage({ binary: [...Buffer.from("fo")], base64: "not-used" });
    await expect(readSystemClipboardContent()).resolves.toEqual({ kind: "image", data: "Zm8=", mimeType: "image/png" });
    expect(base64).not.toHaveBeenCalled();
  });

  it("canonicalizes a native binding's unpadded base64 fallback", async () => {
    installImage({ base64: "Zg" });
    await expect(readSystemClipboardContent()).resolves.toEqual({ kind: "image", data: "Zg==", mimeType: "image/png" });
  });

  it.each([
    ["unavailable", null],
    ["empty", { binary: [], base64: "" }],
    ["malformed or invalid binary", { binary: [256], base64: "invalid!" }],
  ] as const)("reads no image when the clipboard image is %s", async (_label, image) => {
    installImage(image);
    await expect(readSystemClipboardContent()).resolves.toBeNull();
  });
});
