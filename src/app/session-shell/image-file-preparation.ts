import { open } from "node:fs/promises";
import { extname } from "node:path";
import { ImageAttachmentError } from "../../contracts/owned-ui/index.js";
import { prepareImage, type PreparedImage } from "./image-preparation.js";
import { assertSourceBytes } from "./image-source.js";

/** Supported image-file candidates still require actual byte/MIME validation in the image worker. */
export function imageFileMimeType(file: string): string | undefined {
  switch (extname(file).toLowerCase()) {
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".bmp": return "image/bmp";
    default: return undefined;
  }
}

/** Reads at most the bounded stat size plus one growth-detection byte, then uses ordinary image preparation. */
export async function prepareImageFile(path: string, signal: AbortSignal): Promise<PreparedImage> {
  try {
    if (signal.aborted) throw new ImageAttachmentError("image-canceled");
    const file = await open(path, "r");
    try {
      const stat = await file.stat();
      if (!stat.isFile()) throw new ImageAttachmentError("paste-screenshot");
      assertSourceBytes(stat.size);
      const bytes = Buffer.alloc(stat.size + 1);
      let length = 0;
      while (length < bytes.length) {
        if (signal.aborted) throw new ImageAttachmentError("image-canceled");
        const read = await file.read(bytes, length, bytes.length - length, null);
        if (read.bytesRead === 0) break;
        length += read.bytesRead;
      }
      if (signal.aborted) throw new ImageAttachmentError("image-canceled");
      if (length !== stat.size) throw new ImageAttachmentError("image-data");
      const mimeType = imageFileMimeType(path);
      if (mimeType === undefined) throw new ImageAttachmentError("image-mime");
      return await prepareImage({ data: bytes.subarray(0, length).toString("base64"), mimeType });
    } finally { await file.close(); }
  } catch (error) {
    if (error instanceof ImageAttachmentError) throw error;
    // Security: filesystem errors may include private paths; only a fixed retry diagnostic crosses IPC.
    throw new ImageAttachmentError("paste-screenshot");
  }
}
