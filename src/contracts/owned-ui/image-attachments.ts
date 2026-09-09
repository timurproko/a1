import type { OwnedUiImageAttachment } from "./model.js";

export const MAX_PROMPT_IMAGES = 8;
/** Limit applies to canonical ASCII base64, not decoded image bytes. */
export const MAX_IMAGE_DATA_BYTES = 8 * 1024 * 1024;

const MESSAGES = {
  "image-size": "Image exceeds the 8 MiB encoded base64 limit. Reduce the image size and paste it again.",
  "image-count": "A prompt supports at most 8 images. Remove an attachment before adding another.",
  "image-data": "Image data is invalid. Paste a valid image again.",
  "image-mime": "Image MIME type is invalid. Paste a supported image again.",
  "image-source-size": "Source image exceeds 20 MiB. Reduce the source size and paste it again.",
  "image-pixels": "Source image exceeds 40 million pixels or a 32768-pixel dimension. Reduce its dimensions and paste again.",
  "image-conversion": "This image cannot be safely resized. Paste a PNG or JPEG screenshot instead.",
  "image-codec": "Image preparation is unavailable. Check the installation and paste again.",
  "image-output": "Image cannot fit the output limits without excessive quality loss. Crop it and paste again.",
  "image-timeout": "Image preparation timed out. Remove the failed image and paste again.",
  "image-busy": "Image preparation is full (8 pending images). Wait or remove an image before pasting again.",
  "image-canceled": "Image preparation was canceled. Paste the image again.",
  "image-pending": "Image is still preparing. Wait before submitting.",
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

const VALIDATED_IMAGES = new WeakSet<object>();
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Final command admission also covers restored and deferred non-clipboard inputs. */
export function assertPromptImages(images: readonly OwnedUiImageAttachment[]): void {
  if (!Array.isArray(images) || images.length > MAX_PROMPT_IMAGES) throw new ImageAttachmentError("image-count");
  for (const image of images) {
    if (!image || image.type !== "image") throw new ImageAttachmentError("image-data");
    if (VALIDATED_IMAGES.has(image)) continue;
    assertImageEncodedSize(image.data);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data) || image.data.length % 4 !== 0
      || (image.data.endsWith("==") && (BASE64_ALPHABET.indexOf(image.data.at(-3) ?? "") & 15) !== 0)
      || (image.data.endsWith("=") && !image.data.endsWith("==") && (BASE64_ALPHABET.indexOf(image.data.at(-2) ?? "") & 3) !== 0)) {
      throw new ImageAttachmentError("image-data");
    }
    if (typeof image.mimeType !== "string" || image.mimeType.length > 256 || !/^image\/[a-z0-9.+-]+$/i.test(image.mimeType)) {
      throw new ImageAttachmentError("image-mime");
    }
    // Security: cache only immutable own data properties, never frozen objects with changing getters.
    if (Object.isFrozen(image) && (["type", "data", "mimeType"] as const).every(key => Object.getOwnPropertyDescriptor(image, key)?.value === image[key])) {
      VALIDATED_IMAGES.add(image);
    }
  }
}
