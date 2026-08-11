import { appendFileSync, readFileSync } from "node:fs";

const logPath = process.env.ADDONE_FIXTURE_LOG;
const log = (message: string) => {
  if (logPath) appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
};
const size = () => {
  const path = process.env.ADDONE_TEST_TERMINAL_SIZE_PATH;
  if (path) {
    try {
      const outer = JSON.parse(readFileSync(path, "utf8")) as { columns?: number; rows?: number };
      if (outer.columns && outer.rows) return `${outer.columns}x${outer.rows}`;
    } catch {}
  }
  return `${process.stdout.columns ?? 80}x${process.stdout.rows ?? 24}`;
};
const vanillaMode = process.env.ADDONE_FIXTURE_VANILLA === "1";
const inputModes = vanillaMode
  ? "\x1b[?1004h\x1b[?2004h"
  : "\x1b[?1049h\x1b[?1000h\x1b[?1006h\x1b[?1004h\x1b[?2004h";
const resetModes = vanillaMode
  ? "\x1b[?1004l\x1b[?2004l"
  : "\x1b[?1000l\x1b[?1006l\x1b[?1004l\x1b[?2004l\x1b[?1049l";
const paint = () => {
  process.stdout.write(`${inputModes}\x1b[2J\x1b[H`);
  process.stdout.write("\x1b[1;38;2;80;220;140mPI FIXTURE\x1b[0m\r\n");
  process.stdout.write("\x1b[48;5;24m\x1b[38;5;231mCOLOR MATRIX\x1b[0m \x1b[3;4;33mATTRIBUTES\x1b[0m\r\n");
  process.stdout.write(`WIDE:界 SIZE:${size()}`);
  if (vanillaMode) process.stdout.write(`\x1b[${process.stdout.rows ?? 24};1HREADY> `);
  else process.stdout.write("\r\nREADY> ");
  log(`paint size=${size()}`);
};
let command = "";
let historyMode = false;
let awaitingQueries = false;
let consecutiveCtrlC = 0;
let conversationStressMode = false;
let conversationBusy = false;
let conversationTurn = 0;
const conversationTranscript: string[] = [];

const paintConversation = (status: string, input = "") => {
  const columns = process.stdout.columns ?? 80;
  const rows = process.stdout.rows ?? 24;
  const contentRows = Math.max(1, rows - 3);
  const visibleTranscript = conversationTranscript.slice(-contentRows);
  const lines = [
    `SIMULATED CONVERSATION — ${conversationTurn}/50`.slice(0, columns),
    ...visibleTranscript.map(line => line.slice(0, columns)),
  ].slice(-Math.max(1, rows - 2));
  process.stdout.write("\x1b[?2026h\x1b[?25l\x1b[H");
  for (let row = 0; row < rows - 2; row++) {
    process.stdout.write(`\x1b[${row + 1};1H${lines[row] ?? ""}\x1b[K`);
  }
  process.stdout.write(`\x1b[${rows - 1};1H\x1b[48;5;24m\x1b[38;5;231m STATUS ${status.padEnd(Math.max(0, columns - 8)).slice(0, Math.max(0, columns - 8))}\x1b[0m\x1b[K`);
  process.stdout.write(`\x1b[${rows};1HINPUT> ${input}\x1b[K\x1b[${rows};${Math.min(columns, 8 + input.length)}H\x1b[?25h\x1b[?2026l`);
};

const answerConversationQuestion = (question: string) => {
  if (conversationBusy) return;
  conversationBusy = true;
  conversationTurn += 1;
  const label = String(conversationTurn).padStart(2, "0");
  conversationTranscript.push(`YOU ${label}: ${question}`);
  paintConversation(`QUESTION ${label} ACCEPTED`);
  setTimeout(() => paintConversation(`THINKING ${label} ...`), 60);
  setTimeout(() => {
    conversationTranscript.push(`ASSISTANT ${label}: streaming response`);
    paintConversation(`GENERATING ${label}`);
  }, 120);
  setTimeout(() => {
    conversationTranscript[conversationTranscript.length - 1] = `ASSISTANT ${label}: ANSWER ${label} COMPLETE`;
    conversationBusy = false;
    paintConversation(conversationTurn >= 50 ? "50 QUESTIONS COMPLETE" : "READY");
  }, 180);
};
if (process.stdin.isTTY) process.stdin.setRawMode?.(true);
process.stdin.setEncoding("utf8");
process.stdin.resume();
process.stdin.on("data", data => {
  const text = String(data);
  const inputHex = Buffer.from(text, "utf8").toString("hex");
  log(`input=${JSON.stringify(text)} inputHex=${inputHex}`);

  if (awaitingQueries && text.includes("\x1b")) {
    process.stdout.write(`\r\nQUERY-RESPONSE:${inputHex}\r\nREADY> `);
    if (/\x1b\[\?0u/.test(text)) awaitingQueries = false;
    return;
  }

  if (text === "\x03") {
    consecutiveCtrlC += 1;
    if (consecutiveCtrlC === 1) {
      command = "";
      process.stdout.write("\x1b[2J\x1b[HCTRL-C CLEARED\r\nREADY> ");
      return;
    }
    process.stdout.write(resetModes);
    log("exit=0 repeated-ctrl-c");
    setTimeout(() => process.exit(0), 150);
    return;
  }
  consecutiveCtrlC = 0;

  if (conversationStressMode) {
    command += text;
    if (/\r$/.test(command)) {
      const question = command.slice(0, -1);
      command = "";
      answerConversationQuestion(question);
    }
    return;
  }

  if (historyMode && /^\x1b\[<6[45];\d+;\d+[Mm]$/.test(text)) {
    process.stdout.write("\x1b[2J\x1b[HPI FIXTURE\r\nHISTORY VIEW:older\r\nEDITOR:\r\nREADY> ");
    return;
  }
  if (historyMode && text === "\x1b[A") {
    process.stdout.write("\x1b[2J\x1b[HPI FIXTURE\r\nHISTORY VIEW:older\r\nEDITOR:previous message\r\nREADY> ");
    return;
  }
  if (historyMode && text === "\x1b[B") {
    process.stdout.write("\x1b[2J\x1b[HPI FIXTURE\r\nHISTORY VIEW:bottom\r\nEDITOR:\r\nREADY> ");
    return;
  }

  process.stdout.write(`\r\nINPUT:${JSON.stringify(text)}\r\nREADY> `);
  command += text;
  if (/history\r?$/.test(command)) {
    historyMode = true;
    process.stdout.write("\x1b[2J\x1b[HPI FIXTURE\r\nHISTORY VIEW:bottom\r\nEDITOR:\r\nREADY> ");
    command = "";
  }
  if (/rapid\r?$/.test(command)) {
    process.stdout.write("\x1b[8;1HRAPID:1");
    process.stdout.write("\x1b[8;7H2");
    queueMicrotask(() => process.stdout.write("\x1b[8;7H3\x1b[4;8H"));
    command = "";
  }
  if (/^stream\r?$/.test(command)) {
    command = "";
    let row = 0;
    const timer = setInterval(() => {
      row += 1;
      process.stdout.write(`\r\nSTREAM:${row}`);
      if (row >= 36) {
        clearInterval(timer);
        process.stdout.write("\r\nSTREAM:DONE\r\nREADY> ");
      }
    }, 8);
  }
  if (/^conversation-stress\r?$/.test(command)) {
    command = "";
    conversationStressMode = true;
    paintConversation("READY");
  }
  if (/^stable-stream\r?$/.test(command)) {
    command = "";
    let row = 0;
    const bottom = process.stdout.rows ?? 24;
    const timer = setInterval(() => {
      row += 1;
      process.stdout.write(`\x1b[?2026h\x1b[${bottom};1H\r\nSTABLE:${row}\r\nSTATUS:GENERATING ${row}\x1b[?2026l`);
      if (row >= 12) {
        clearInterval(timer);
        process.stdout.write(`\x1b[?2026h\x1b[${bottom};1H\r\nSTATUS:DONE\x1b[?2026l`);
      }
    }, 30);
  }
  if (/synchronized\r?$/.test(command)) {
    process.stdout.write("\x1b[?2026h\x1b[9;1HSYNC:PARTIAL");
    setTimeout(() => process.stdout.write("\x1b[9;1HSYNC:COMMITTED\x1b[?2026l"), 40);
    command = "";
  }
  if (/cross-turn-frame\r?$/.test(command)) {
    process.stdout.write("\x1b[?2026h\x1b[10;1HCROSS-TURN:COMMITTED\x1b[?2026l");
    setImmediate(() => process.stdout.write("\x1b[10;21H\x1b[5 q\x1b[?25h"));
    command = "";
  }
  if (/queries\r?$/.test(command)) {
    awaitingQueries = true;
    process.stdout.write("\x1b[c\x1b[6n\x1b[18t\x1b[16t\x1b]10;?\x07\x1b]11;?\x07\x1b]4;2;?\x07\x1bP+q544e;524742\x1b\\\x1b[?u");
    command = "";
  }
  if (/keyboard-kitty\r?$/.test(command)) {
    process.stdout.write("\x1b[>7u\r\nKITTY-KEYBOARD-READY\r\nREADY> ");
    command = "";
  }
  if (/keyboard-modify\r?$/.test(command)) {
    process.stdout.write("\x1b[>4;2m\r\nMODIFY-KEYBOARD-READY\r\nREADY> ");
    command = "";
  }
  if (/alternate-scroll\r?$/.test(command)) {
    historyMode = true;
    process.stdout.write("\x1b[?1000l\x1b[?1006l\x1b[?1007h\x1b[2J\x1b[HPI FIXTURE\r\nHISTORY VIEW:bottom\r\nEDITOR:\r\nREADY> ");
    command = "";
  }
  if (/leak-exit\r?$/.test(command)) {
    process.stdout.write("\x1b[?1003h\x1b[?1006h\x1b[?2004h\x1b[>7u\r\nLEAKING MODES");
    setTimeout(() => process.exit(0), 20);
    command = "";
  }
  if (/crash\r?$/.test(command)) {
    process.stdout.write("\r\nCRASHING WITHOUT CLEANUP");
    setTimeout(() => process.exit(9), 20);
    command = "";
  }
  if (/alternate\r?$/.test(command)) {
    process.stdout.write("\x1b[?1049l\x1b[?1049h\x1b[2J\x1b[HALTERNATE SCREEN\x1b[?25l");
    setTimeout(() => process.stdout.write("\x1b[?25h\x1b[2J\x1b[HPI FIXTURE\r\nHISTORY VIEW:older\r\nEDITOR:previous message\r\nALTERNATE RESTORED\r\nREADY> "), 300);
    command = "";
  }
  if (/closure-exit\r?$/.test(command)) {
    process.stdout.write("\r\nCLOSURE STATUS\r\n\r\nTo resume this session: fixture --session exact\r\n\r\n");
    log("exit=0 closure-layout");
    setTimeout(() => process.exit(0), 20);
    return;
  }
  const match = /exit\s+(-?\d+)\r?$/.exec(command);
  if (match) {
    const exitCode = Number(match[1]);
    process.stdout.write(`\r\nFINAL SURFACE exit=${exitCode}\r\n${resetModes}`);
    log(`exit=${exitCode}`);
    setTimeout(() => process.exit(exitCode), 20);
  } else if (/\r$/.test(command)) {
    process.stdout.write(`\r\nCOMMAND:${JSON.stringify(command.slice(0, -1))}\r\nREADY> `);
    command = "";
  }
  if (command.length > 512) command = command.slice(-512);
});
process.on("SIGWINCH", () => {
  process.stdout.write(`\r\nRESIZED:${size()}\r\nREADY> `);
  log(`resize=${size()}`);
});
process.on("SIGTERM", () => { log("SIGTERM"); process.stdout.write(resetModes); process.exit(143); });
paint();
