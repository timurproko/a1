import { stripAnsi } from "../../src/ui/components/index.js";

// Protocol: resolve SGR foreground and faint state at a visible character, including outer wrappers.
export function cellStyle(row: string, target: string): { foreground: string; faint: boolean } {
  let foreground = "default";
  let faint = false;
  for (const token of row.matchAll(/\x1b\[([\d;]*)m|([^\x1b])/gu)) {
    if (token[1] !== undefined) {
      const codes = token[1].split(";").map(Number);
      for (let index = 0; index < codes.length; index++) {
        const code = codes[index];
        if (code === 0) { foreground = "default"; faint = false; }
        else if (code === 2) faint = true;
        else if (code === 22) faint = false;
        else if (code === 39) foreground = "default";
        else if (code === 38 && codes[index + 1] === 2) {
          foreground = codes.slice(index + 2, index + 5).join(";"); index += 4;
        } else if (code === 38 && codes[index + 1] === 5) {
          foreground = `palette:${codes[index + 2]}`; index += 2;
        } else if (code === 48 && codes[index + 1] === 2) {
          index += 4;
        } else if (code === 48 && codes[index + 1] === 5) {
          index += 2;
        }
      }
    } else if (token[2] === target) return { foreground, faint };
  }
  throw new Error(`Missing character ${target} in ${stripAnsi(row)}`);
}

/** Resolve the SGR background at one zero-based visible character column. */
export function cellBackgroundAt(row: string, column: number): string {
  let background = "default";
  let visibleColumn = 0;
  for (const token of row.matchAll(/\x1b\[([\d;]*)m|([^\x1b])/gu)) {
    if (token[1] !== undefined) {
      const codes = token[1].split(";").map(Number);
      for (let index = 0; index < codes.length; index++) {
        const code = codes[index];
        if (code === 0 || code === 49) background = "default";
        else if (code === 38 && codes[index + 1] === 2) index += 4;
        else if (code === 38 && codes[index + 1] === 5) index += 2;
        else if (code === 48 && codes[index + 1] === 2) {
          background = codes.slice(index + 2, index + 5).join(";"); index += 4;
        } else if (code === 48 && codes[index + 1] === 5) {
          background = `palette:${codes[index + 2]}`; index += 2;
        }
      }
    } else {
      if (visibleColumn === column) return background;
      visibleColumn += 1;
    }
  }
  throw new Error(`Missing column ${column} in ${stripAnsi(row)}`);
}
