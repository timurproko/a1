import { describe, expect, it, vi } from "vitest";
import { Worker } from "node:worker_threads";
import * as photon from "@silvia-odwyer/photon-node";
import { screenshotPng, withPngOrientation } from "../../../fixtures/image-sources.js";
import { ImagePreparationClient, runImageWorker } from "../../../../src/integrations/pi/session-ui/image-preparation-client.js";
import { sourceImageInfo, assertSourceBytes, MAX_SOURCE_IMAGE_BYTES } from "../../../../src/integrations/pi/session-ui/image-source.js";
import { prepareImage, type PreparedImage } from "../../../../src/integrations/pi/session-ui/image-preparation.js";
import { readSystemClipboardImage } from "../../../../src/integrations/pi/session-ui/system-clipboard.js";
import { canonicalizeStandardBase64 } from "../../../../src/integrations/pi/session-ui/clipboard-image.js";

const prepare = (bytes: Uint8Array, limits = {}, mimeType = "image/png"): Promise<PreparedImage> => runImageWorker({
  kind: "prepare", source: { data: Buffer.from(bytes).toString("base64"), mimeType }, limits,
}, AbortSignal.timeout(15_000));

describe("large screenshot preparation", () => {
  it("admits the real over-8-MiB source that previously failed before preparation", async () => {
    const bytes = screenshotPng();
    expect(bytes.toString("base64").length).toBeGreaterThan(8 * 1024 * 1024);
    expect(bytes.length).toBeLessThan(MAX_SOURCE_IMAGE_BYTES);
    const image = await readSystemClipboardImage({ hasImage: () => true, getImageBase64: async () => bytes.toString("base64") });
    expect(image?.mimeType).toBe("image/png");
    expect(Buffer.from(image?.data ?? "", "base64").equals(bytes)).toBe(true);
  });

  it("resizes in a real cold worker while the UI thread progresses", async () => {
    const bytes = screenshotPng();
    let beats = 0;
    const heartbeat = setInterval(() => beats++, 10);
    try {
      const image = await prepare(bytes);
      expect(beats).toBeGreaterThan(1);
      expect(image.transformed).toBe(true);
      expect(image.data.length).toBeLessThan(4.5 * 1024 * 1024);
      const output = Buffer.from(image.data, "base64");
      expect(output.length).toBeLessThanOrEqual(5 * 1024 * 1024);
      const info = sourceImageInfo(output, image.mimeType);
      expect(Math.max(info.width, info.height)).toBeLessThanOrEqual(2000);
      expect(info.width / info.height).toBeCloseTo(2560 / 1440, 2);
      const decoded = photon.PhotonImage.new_from_byteslice(output);
      try { expect(decoded.get_width()).toBe(info.width); expect(decoded.get_height()).toBe(info.height); }
      finally { decoded.free(); }
    } finally { clearInterval(heartbeat); }
  }, 20_000);

  it.each([[16, 16], [3840, 2160], [7680, 4320]])("preserves an already-small %ix%i PNG byte-for-byte without decoding it", async (width, height) => {
    const bytes = screenshotPng(width, height, false);
    const image = await prepare(bytes);
    expect(image.transformed).toBe(false);
    expect(image.width).toBe(width); expect(image.height).toBe(height);
    expect(Buffer.from(image.data, "base64").equals(bytes)).toBe(true);
    expect(image.mimeType).toBe("image/png");
  }, 20_000);

  it("prefers lossless PNG and preserves visible EXIF orientation during conversion", async () => {
    const source = withPngOrientation(screenshotPng(100, 200, false), 6);
    expect(sourceImageInfo(source, "image/png").orientation).toBe(6);
    const image = await prepare(source, { maxDimension: 100 });
    expect(image).toMatchObject({ mimeType: "image/png", width: 100, height: 50, transformed: true });
    expect(sourceImageInfo(Buffer.from(image.data, "base64"), image.mimeType).orientation).toBe(1);
  });

  it("uses the highest-fitting JPEG quality without upscaling and honors encoded limits", async () => {
    const source = screenshotPng(128, 128);
    const decoded = photon.PhotonImage.new_from_byteslice(source);
    let expected: Uint8Array;
    try { expected = decoded.get_bytes_jpeg(85); } finally { decoded.free(); }
    const limit = 4 * Math.ceil(expected.length / 3);
    expect(source.length * 4 / 3).toBeGreaterThan(limit);
    const image = await prepare(source, { encodedBytes: limit });
    expect(image).toMatchObject({ mimeType: "image/jpeg", width: 128, height: 128 });
    expect(image.data.length).toBeLessThanOrEqual(limit);
    expect(Buffer.from(image.data, "base64").equals(Buffer.from(expected))).toBe(true);
  });

  it("preserves transparent PNG output", async () => {
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let i = 0; i < pixels.length; i += 4) { pixels[i] = (i * 13) % 256; pixels[i + 3] = i % 8 ? 255 : 0; }
    const source = new photon.PhotonImage(pixels, 128, 128);
    let bytes: Uint8Array;
    try { bytes = source.get_bytes(); } finally { source.free(); }
    const image = await prepare(bytes, { maxDimension: 64 });
    expect(image.mimeType).toBe("image/png");
    const decoded = photon.PhotonImage.new_from_byteslice(Buffer.from(image.data, "base64"));
    try { expect(decoded.get_raw_pixels().some((byte, index) => index % 4 === 3 && byte < 255)).toBe(true); }
    finally { decoded.free(); }
  });

  it("composites JPEG candidates against white rather than dropping alpha onto black", async () => {
    const decoded = photon.PhotonImage.new_from_byteslice(screenshotPng(128, 128));
    let pixels: Uint8Array;
    try { pixels = decoded.get_raw_pixels(); } finally { decoded.free(); }
    for (let p = 3; p < pixels.length; p += 8) pixels[p] = 0;
    const transparent = new photon.PhotonImage(pixels, 128, 128);
    let source: Uint8Array;
    try { source = transparent.get_bytes(); } finally { transparent.free(); }
    for (let p = 0; p < pixels.length; p += 4) if (pixels[p + 3] === 0) pixels.fill(255, p, p + 4);
    const opaque = new photon.PhotonImage(pixels, 128, 128);
    let expected: Uint8Array;
    try { expected = opaque.get_bytes_jpeg(85); } finally { opaque.free(); }
    const image = await prepare(source, { encodedBytes: 4 * Math.ceil(expected.length / 3) });
    expect(image.mimeType).toBe("image/jpeg");
    expect(Buffer.from(image.data, "base64").equals(Buffer.from(expected))).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])("preserves EXIF orientation %i through actual pixel conversion", async orientation => {
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]];
    const pixels = new Uint8Array(8 * 12 * 4);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) pixels.set([...(colors[(y >= 6 ? 2 : 0) + (x >= 4 ? 1 : 0)] ?? []), 255], (y * 8 + x) * 4);
    const raw = new photon.PhotonImage(pixels, 8, 12);
    let source: Buffer;
    try { source = withPngOrientation(Buffer.from(raw.get_bytes()), orientation); } finally { raw.free(); }
    const image = await prepare(source, { encodedBytes: source.toString("base64").length - 4 });
    expect(image.transformed).toBe(true);
    expect([image.width, image.height]).toEqual(orientation >= 5 ? [12, 8] : [8, 12]);
    const decoded = photon.PhotonImage.new_from_byteslice(Buffer.from(image.data, "base64"));
    try {
      expect([...decoded.get_raw_pixels().slice(0, 3)]).toEqual(colors[[0, 1, 3, 2, 0, 2, 3, 1][orientation - 1] ?? 0]);
    } finally { decoded.free(); }
  });

  it("rejects impossible output budgets instead of shrinking into an unreadable success", async () => {
    await expect(prepare(screenshotPng(128, 128), { encodedBytes: 16 })).rejects.toMatchObject({ code: "image-output" });
  });

  it("rejects main-thread codec work even when the API returns a promise", async () => {
    await expect(prepareImage({ data: "AAAA", mimeType: "image/png" })).rejects.toThrow("requires a worker");
  });

  it("keeps source limits separate from canonical final limits", () => {
    for (const length of [MAX_SOURCE_IMAGE_BYTES - 1, MAX_SOURCE_IMAGE_BYTES]) expect(() => assertSourceBytes(length)).not.toThrow();
    expect(() => assertSourceBytes(MAX_SOURCE_IMAGE_BYTES + 1)).toThrow("20 MiB");
    const boundary = Buffer.alloc(MAX_SOURCE_IMAGE_BYTES).toString("base64");
    expect(canonicalizeStandardBase64(boundary, true)?.length).toBe(boundary.length);
    expect(canonicalizeStandardBase64(boundary.replace(/=+$/, ""), true)).toBe(boundary);
    expect(() => canonicalizeStandardBase64(`${boundary}AAAA`, true)).toThrow("20 MiB");
  });

  it.each([[8000, 4999, true], [8000, 5000, true], [8000, 5001, false], [32768, 1, true], [32769, 1, false]])("preflights %ix%i before decoding (eligible=%s)", (width, height, valid) => {
    const bytes = screenshotPng(1, 1, false);
    bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20);
    if (valid) expect(sourceImageInfo(bytes, "image/png")).toMatchObject({ width, height });
    else expect(() => sourceImageInfo(bytes, "image/png")).toThrow("40 million pixels");
  });

  it("recovers from corrupt codec input and never forwards arbitrary error text", async () => {
    const bytes = screenshotPng(8, 8);
    bytes[50] = 255;
    await expect(prepare(bytes, { maxDimension: 4 })).rejects.toMatchObject({ code: "image-conversion" });
    const image = await prepare(screenshotPng(4, 4));
    expect(image.width).toBe(4);
  });
});

describe("bounded preparation lifecycle", () => {
  it("awaits termination of a busy real worker during disposal", async () => {
    const terminate = vi.spyOn(Worker.prototype, "terminate");
    const client = new ImagePreparationClient();
    const data = screenshotPng().toString("base64");
    try {
      const job = client.start(async () => ({ kind: "image", data, mimeType: "image/png" }));
      await new Promise(resolve => setTimeout(resolve, 100));
      await client.dispose();
      await expect(job.result).rejects.toMatchObject({ code: "image-canceled" });
      expect(terminate).toHaveBeenCalled();
      for (const invocation of terminate.mock.results) if (invocation.type === "return") await expect(invocation.value).resolves.toBeTypeOf("number");
      await expect(client.start(async () => null).result).rejects.toMatchObject({ code: "image-canceled" });
    } finally { await client.dispose(); terminate.mockRestore(); }
  });

  it("bounds pending acquisition, cancels cooperatively, and permits later pastes", async () => {
    const client = new ImagePreparationClient();
    const signals: AbortSignal[] = [];
    const jobs = Array.from({ length: 8 }, () => client.start(signal => { signals.push(signal); return new Promise(() => {}); }));
    await new Promise(resolve => setImmediate(resolve));
    await expect(client.start(async () => null).result).rejects.toMatchObject({ code: "image-busy" });
    for (const job of jobs) job.cancel();
    await Promise.all(jobs.map(job => expect(job.result).rejects.toMatchObject({ code: "image-canceled" })));
    expect(signals.every(signal => signal.aborted)).toBe(true);
    await expect(client.start(async () => ({ kind: "text", text: "next" })).result).resolves.toEqual({ kind: "text", text: "next" });
    client.dispose();
  });

  it("deadlines include acquisition and settle without an unhandled rejection", async () => {
    vi.useFakeTimers();
    const client = new ImagePreparationClient();
    try {
      const job = client.start(async () => new Promise(() => {}));
      const rejected = expect(job.result).rejects.toMatchObject({ code: "image-timeout" });
      await vi.advanceTimersByTimeAsync(15_001);
      await rejected;
    } finally { client.dispose(); vi.useRealTimers(); }
  });

  it("aborts active off-thread conversion and releases the slot for subsequent work", async () => {
    const client = new ImagePreparationClient();
    const data = screenshotPng().toString("base64");
    try {
      const job = client.start(async () => ({ kind: "image", data, mimeType: "image/png" }));
      await new Promise(resolve => setTimeout(resolve, 100));
      job.cancel();
      await expect(job.result).rejects.toMatchObject({ code: "image-canceled" });
      const next = await client.start(async () => ({ kind: "image", data: screenshotPng(4, 4).toString("base64"), mimeType: "image/png" })).result;
      expect(next?.kind).toBe("image");
    } finally { client.dispose(); }
  });
});
