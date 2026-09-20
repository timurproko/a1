/**
 * Provenance: @earendil-works/pi-coding-agent 0.86.0 (MIT), commit ecac0a9c4edad3dac5d9f8b40e0c7db7a56471fc,
 * packages/coding-agent/src/modes/interactive/components/earendil-announcement.ts.
 * Modifications: Mechanical pinned source port with private imports remapped to public package-root
 * types/APIs and A1-owned theme boundaries. The unchanged image is loaded lazily from its attributed,
 * verified owned resource, preserving pinned image/fallback rows without runtime dependency-directory
 * reads or package mutation. Command-outcome parity exercises the restored presentation.
 * Deviations: none.
 */
import { readFileSync } from "node:fs";
import type EarendilResource from "../assets/earendil-image.json";
import { Container, Image, Spacer, Text } from "@earendil-works/pi-tui";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { piTheme } from "../theme/theme.js";

const BLOG_URL = "https://mariozechner.at/posts/2026-04-08-ive-sold-out/";
const IMAGE_FILENAME = "clankolas.png";
let cachedImageBase64: (typeof EarendilResource)["data"] | undefined;
let attemptedImageLoad = false;

function loadImageBase64(): string | undefined {
	if (attemptedImageLoad) return cachedImageBase64;
	attemptedImageLoad = true;
	try {
		const resource: unknown = JSON.parse(readFileSync(new URL("../assets/earendil-image.json", import.meta.url), "utf8"));
		if (resource && typeof resource === "object" && "data" in resource && typeof resource.data === "string") cachedImageBase64 = resource.data;
	} catch {
		cachedImageBase64 = undefined;
	}
	return cachedImageBase64;
}

export class EarendilAnnouncementComponent extends Container {
	constructor() {
		super();

		this.addChild(new DynamicBorder((text) => piTheme().fg("accent", text)));
		this.addChild(new Text(piTheme().bold(piTheme().fg("accent", "pi has joined Earendil")), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(piTheme().fg("muted", "Read the blog post:"), 1, 0));
		this.addChild(new Text(piTheme().fg("mdLink", BLOG_URL), 1, 0));
		this.addChild(new Spacer(1));
		const imageBase64 = loadImageBase64();
		if (imageBase64) {
			this.addChild(new Image(imageBase64, "image/png", { fallbackColor: text => piTheme().fg("muted", text) }, { maxWidthCells: 56, filename: IMAGE_FILENAME }));
			this.addChild(new Spacer(1));
		}
		this.addChild(new DynamicBorder((text) => piTheme().fg("accent", text)));
	}
}
