## Context and root cause

`src/app/session-shell/path-chip-presentation.ts` selects `"🖼 "` for image files and then adds another space before the label. U+1F5BC has Unicode Emoji_Presentation=false; U+1F5BC U+FE0F is an RGI emoji sequence. The other generated paste icons (📁, 📄, 📷, 🔗, 🟧) already have Emoji_Presentation=true. This explains why the image-file glyph can appear smaller even when the file and screenshot glyphs look normal.

A local Node Unicode-property probe confirms these differences. The physical terminal ultimately controls font artwork and sizing; automated checks can establish the emitted Unicode sequence and geometry, not promise identical artwork across fonts.

## Decisions

1. Fix the generated icon at its producer: emit `"🖼\uFE0F"` and retain the shared single separator. Do not normalize arbitrary pasted text, filenames, or screenshot markers.
2. Extend canonical chip recognition to accept the optional U+FE0F on the framed-picture icon while retaining existing one/two-space bare forms. Legacy chip text stays byte-for-byte intact through protection and restoration.
3. Exercise generated labels and both canonical forms through the existing wrapping, editor, and selection contracts. Reuse the owned terminal-width authorities; change geometry code only if focused tests expose a defect.
4. Keep the other paste icons unchanged and establish that the generated icon set is emoji-presenting. No global Unicode rewrite or font configuration is necessary.

## Validation approach

Run strict OpenSpec validation, typecheck, and only the affected shell, contract, and component test files. Check exact generated sequences, canonical match boundaries, neighboring chip wrapping/selection, and unchanged path copy/history/submission expansion. A physical terminal check should compare pasted image paths with file and screenshot chips after a build; it is not claimed complete by unit tests.

## Risks and compatibility

The existing extra space may compensate for a one-cell text glyph; replacing it with the emoji selector requests a two-cell emoji without adding a second separator. Tests must use the renderer's actual width authority. Existing literal/history labels remain recognized and unmodified. PR #930 also changes the chip contract for filename-bearing attachments; reconcile its integrated form before implementation handoff rather than duplicating its image identifier policy.
