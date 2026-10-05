## Context

The README currently has five top-level task sections, with Update nested under Use, and places each large A1 illustration near a section boundary. A new navigator must remain readable in GitHub's sanitized Markdown, work in light and dark themes, and avoid platform-dependent emoji styling.

The preview tool asks GitHub to render Markdown, writes the returned HTML into a local temporary page, and uses a `<base>` pointing at the source directory so relative image paths load. That base also changes how `href="#install"` resolves: the browser targets the source directory plus a fragment rather than the generated preview page.

## Goals / Non-Goals

**Goals:**
- Give every main README task a direct, branded section link.
- Make Update a peer of Use.
- Match the visual language and theme colors of the existing A1 illustrations.
- Keep icons free of hover underlines without reducing the clickable target.
- Preserve local image resolution while making local fragment navigation scroll the preview.

**Non-Goals:**
- Redesigning the README content, badges, large illustrations, or GitHub heading style.
- Adding a web framework, icon dependency, or runtime-generated icon system.
- Changing GitHub's native anchor generation or general browser navigation behavior.

## Decisions

### 1. Use six owned SVG icon assets

Create one small SVG for each top-level destination: Install, Use, Update, Extensions, Develop, and Publish. Each icon uses crisp square geometry and sparse terminal-like linework rather than emoji or a third-party icon vocabulary. The assets use A1 blue (`#2638d2`) in light mode and the existing illustration blue (`#a6b5ff`) under `prefers-color-scheme: dark`.

The icons remain intentionally simple at navigation size and expose no redundant alternative text because the adjacent label names the destination. The existing large illustrations remain unchanged.

### 2. Keep image and label in one link

Each navigator item is one anchor containing an inline image followed by its text label. Browser text decoration applies to the label but not the replaced image, so the whole item stays clickable while hover underlining is visually limited to text. Separators remain outside anchors.

Update becomes `## Update`, and the navigator follows document order: Install, Use, Update, Extensions, Develop, Publish. The terminal illustration moves from the Install/Use boundary to the space immediately before Install.

### 3. Rebase preview fragments without changing the asset base

Keep the source-directory `<base>` because local README images depend on it. In the generated preview page, rewrite fragment-only anchor destinations against `window.location.href` rather than the document base. The resulting links target the generated `index.html#fragment`, allowing native browser scrolling and history while source-relative images continue to resolve from the repository checkout.

Only fragment-only links are rebased. External, repository-relative, and absolute links retain GitHub-rendered behavior.

### 4. Cover structure and URL behavior with focused tests

Add focused tests that verify all six headings and destinations, owned icon references and assets, image-before-Install placement, and label-only decoration structure. Isolate or expose the preview fragment rebasing logic enough to verify that fragments resolve to the generated preview URL and non-fragment links remain unchanged without launching a browser.

## Risks / Trade-offs

- [Very small SVGs lose detail] -> Use simple square motifs and validate them in the actual GitHub-rendered preview at their final size.
- [Theme media queries differ through image proxies] -> Use the same light/dark color values as existing README artwork and manually inspect both themes where available.
- [Anchor repair interferes with other links] -> Select only `href` values beginning with `#` and retain all other destinations verbatim.
- [HTML sanitization changes nesting] -> Use only GitHub-supported anchor and image markup and validate through GitHub's Markdown API preview.
