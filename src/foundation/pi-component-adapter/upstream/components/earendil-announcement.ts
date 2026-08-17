// Mechanically adapted from Pi commit 914cf14
// packages/coding-agent/src/modes/interactive/components/earendil-announcement.ts (MIT).
// Local modifications: remap private imports to public package-root or owned theme boundaries.
import * as fs from "node:fs";
import { Container, Image, Spacer, Text } from "@earendil-works/pi-tui";
import { DynamicBorder, getPackageDir } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { piTheme } from "../theme/theme.js";

const BLOG_URL = "https://mariozechner.at/posts/2026-04-08-ive-sold-out/";
const IMAGE_FILENAME = "clankolas.png";

let cachedImageBase64: string | undefined;
let attemptedImageLoad = false;

function loadImageBase64(): string | undefined {
	if (attemptedImageLoad) {
		return cachedImageBase64;
	}

	attemptedImageLoad = true;
	try {
		cachedImageBase64 = fs.readFileSync(join(getPackageDir(), "dist", "modes", "interactive", "assets", IMAGE_FILENAME)).toString("base64");
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
			this.addChild(
				new Image(
					imageBase64,
					"image/png",
					{ fallbackColor: (text) => piTheme().fg("muted", text) },
					{ maxWidthCells: 56, filename: IMAGE_FILENAME },
				),
			);
			this.addChild(new Spacer(1));
		}

		this.addChild(new DynamicBorder((text) => piTheme().fg("accent", text)));
	}
}
