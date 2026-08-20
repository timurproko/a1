// Mechanically adapted from Pi commit 914cf14
// packages/coding-agent/src/modes/interactive/components/earendil-announcement.ts (MIT).
// Local modifications: remap private imports to public package-root/owned theme boundaries and omit optional package-private imagery.
import { Container, Spacer, Text } from "@earendil-works/pi-tui";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { piTheme } from "../theme/theme.js";

const BLOG_URL = "https://mariozechner.at/posts/2026-04-08-ive-sold-out/";

export class EarendilAnnouncementComponent extends Container {
	constructor() {
		super();

		this.addChild(new DynamicBorder((text) => piTheme().fg("accent", text)));
		this.addChild(new Text(piTheme().bold(piTheme().fg("accent", "pi has joined Earendil")), 1, 0));
		this.addChild(new Spacer(1));
		this.addChild(new Text(piTheme().fg("muted", "Read the blog post:"), 1, 0));
		this.addChild(new Text(piTheme().fg("mdLink", BLOG_URL), 1, 0));
		this.addChild(new Spacer(1));


		this.addChild(new DynamicBorder((text) => piTheme().fg("accent", text)));
	}
}
