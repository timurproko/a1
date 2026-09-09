import type { OwnedUiImageAttachment } from "./model.js";

export const MAX_PROMPT_IMAGES = 8;
/** Limit applies to canonical ASCII base64, not decoded image bytes. */
export const MAX_IMAGE_DATA_BYTES = 8 * 1024 * 1024;

const MESSAGES = {
  "image-size": "Image exceeds the 8 MiB encoded base64 limit. Reduce the image size and paste it again.",
  "image-count": "A prompt supports at most 8 images. Remove an attachment before adding another.",
  "image-data": "Image data is invalid. Paste a valid image again.",
  "image-mime": "Image MIME type is invalid. Paste a supported image again.",
} as const;

/** Trusted, payload-free diagnostics for user-correctable attachment failures. */
export class ImageAttachmentError extends TypeError {
  constructor(readonly code: keyof typeof MESSAGES) {
    super(MESSAGES[code]);
    this.name = "ImageAttachmentError";
  }
}

/** Checks encoded length before decoding or copying a clipboard payload. */
export function assertImageEncodedSize(data: string): void {
  if (typeof data !== "string" || data.length === 0) throw new ImageAttachmentError("image-data");
  if (Math.ceil(data.length / 4) * 4 > MAX_IMAGE_DATA_BYTES) throw new ImageAttachmentError("image-size");
}

/** Final command admission also covers restored and deferred non-clipboard inputs. */
export function assertPromptImages(images: readonly OwnedUiImageAttachment[]): void {
  if (!Array.isArray(images) || images.length > MAX_PROMPT_IMAGES) throw new ImageAttachmentError("image-count");
  for (const image of images) {
    if (!image || image.type !== "image") throw new ImageAttachmentError("image-data");
    assertImageEncodedSize(image.data);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data) || image.data.length % 4 !== 0
      || Buffer.from(image.data, "base64").toString("base64") !== image.data) {
      throw new ImageAttachmentError("image-data");
    }
    if (typeof image.mimeType !== "string" || image.mimeType.length > 256 || !/^image\/[a-z0-9.+-]+$/i.test(image.mimeType)) {
      throw new ImageAttachmentError("image-mime");
    }
  }
}
