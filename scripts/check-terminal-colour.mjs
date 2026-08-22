// Says whether this terminal, launched this way, carries 24-bit colour.
//
// The same escape is printed three ways. When the first block matches the third,
// Node collapsed the colour to the terminal's palette before it reached the
// screen, and every colour the interface draws will be approximate.
const block = "████████";
const write = text => process.stdout.write(text);

write(`\x1b[38;2;138;190;183m${block}\x1b[0m  24-bit #8abeb7 (pinned Pi accent)\n`);
write(`\x1b[38;5;109m${block}\x1b[0m  256-colour index 109\n`);
write(`\x1b[36m${block}\x1b[0m  terminal palette cyan\n`);
write(`\x1b[38;2;95;135;255m${block}\x1b[0m  24-bit #5f87ff (pinned Pi border)\n`);
write(`\x1b[34m${block}\x1b[0m  terminal palette blue\n`);
write("\nFirst block equal to the third means this launch collapses colour.\n");
write("Launch through the installed command, or scripts/dev, to keep 24-bit colour.\n");
write(`stdout isTTY=${process.stdout.isTTY} TERM=${process.env.TERM ?? "-"} COLORTERM=${process.env.COLORTERM ?? "-"}\n`);
