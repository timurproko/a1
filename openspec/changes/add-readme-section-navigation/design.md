## Context

The README has six practical task areas but no direct navigation. Large section-specific illustrations make those boundaries visually expensive and imply a distinct scene for every section. A compact navigator and repeated separator must remain readable in GitHub's sanitized Markdown and stable as content evolves.

The preview tool asks GitHub to render Markdown, writes the returned HTML into a local temporary page, and uses a `<base>` pointing at the source directory so relative image paths load. That base also changes how fragment-only links resolve: the browser targets the source directory rather than the generated preview page.

## Goals / Non-Goals

**Goals:**
- Give every top-level README task area a direct section link.
- Make section boundaries visually consistent and lightweight.
- Keep command examples visually uniform instead of syntax-highlighting ordinary words.
- Preserve local image resolution while making local fragment navigation scroll the preview.

**Non-Goals:**
- Redesigning README prose, badges, or GitHub heading style.
- Maintaining distinct artwork for each section.
- Adding a web framework, icon dependency, or README structure tests coupled to frequently changing content.

## Decisions

### 1. Use a plain-text navigator

The centered navigator contains text links for Install, Launch, Update, Extensions, Develop, and Publish in document order. It uses no icons, avoiding platform-dependent emoji, alignment adjustments, and decorated whitespace while retaining native GitHub link behavior.

### 2. Keep every navigated destination top-level

Install, Launch, Update, Extensions, Develop, and Publish each use a level-two heading. This keeps navigator labels and GitHub-generated fragments direct and predictable.

### 3. Reuse one animated ASCII separator

Remove the section-specific terminal, plugin, gear, and rocket placements from the README. Between each pair of top-level sections, render the same compact `* * *` chapter ornament. Light and dark assets use the font and colors established by the animated waves footer; the three ASCII stars twinkle in sequence, while reduced-motion mode shows a static ornament.

The shared separator lowers visual weight, keeps spacing consistent, and leaves the animated waves footer in place. It avoids tying the navigation structure to a growing set of bespoke scenes. Existing unused artwork files remain repository assets rather than being deleted as part of this presentation change.

### 4. Render commands without shell syntax coloring

Use `text` fences for command examples. Copyable command bytes remain unchanged, while GitHub no longer colors words such as `help` as shell builtins or keywords.

### 5. Rebase preview fragments without changing the asset base

Keep the source-directory `<base>` because local README images depend on it. Rewrite fragment-only destinations against the generated preview file before writing the page. The resulting links target `index.html#fragment`, allowing native browser scrolling and history while source-relative images continue to resolve from the repository checkout.

Only fragment-only links are rebased. External, repository-relative, and absolute links retain GitHub-rendered behavior.

### 6. Validate through the rendered preview

Avoid structure-coupled README tests because headings and navigation will evolve with the project. Render through GitHub's Markdown API and manually verify section order, separator presentation, plain command styling, source-relative images, and same-preview fragment navigation.

## Risks / Trade-offs

- [Repeated motion distracts or excludes motion-sensitive readers] -> Keep the separator compact and softly paced, and disable movement under reduced-motion preferences.
- [Anchor repair interferes with other links] -> Select only `href` values beginning with `#` and retain all other destinations verbatim.
- [README hierarchy evolves] -> Keep navigation limited to top-level task areas and validate presentation directly rather than freezing exact headings in tests.
