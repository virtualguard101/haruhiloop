// 与 play_app.py _entry_panel 视觉对齐：ASCII + SOS 团口号 + 4 项菜单。

import { centerInWidth, splitLines, wrap } from "./ansi";
import { renderPanel } from "./panel";

const FALLBACK_ASCII = [
  " _   _    _    ____  _   _ _   _ ___ _     ___   ___  ____  ",
  "| | | |  / \\  |  _ \\| | | | | | |_ _| |   / _ \\ / _ \\|  _ \\ ",
  "| |_| | / _ \\ | |_) | | | | |_| || || |  | | | | | | | |_) |",
  "|  _  |/ ___ \\|  _ <| |_| |  _  || || |__| |_| | |_| |  __/ ",
  "|_| |_/_/   \\_\\_| \\_\\\\___/|_| |_|___|_____\\___/ \\___/|_|    ",
];

let cachedAscii: string | null = null;

export async function loadEntryAscii(): Promise<string> {
  if (cachedAscii !== null) return cachedAscii;
  try {
    const res = await fetch("./assets/haruhi_ascii.txt");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    cachedAscii = text.replace(/^\n+|\n+$/g, "");
    return cachedAscii;
  } catch {
    cachedAscii = FALLBACK_ASCII.join("\n");
    return cachedAscii;
  }
}

export function renderEntryPanel(
  asciiArt: string,
  width: number,
  rows = Number.POSITIVE_INFINITY,
): string[] {
  const innerWidth = Math.max(2, width - 4);
  const lines: string[] = [];
  // viewport 较矮时只画一份 ASCII（去掉副 LOGO，省一半行数），
  // 极矮（< 24）时连主 ASCII 也跳过，只留口号 + 菜单。
  const showSecondaryAscii = rows >= 50;
  const showPrimaryAscii = rows >= 24;
  if (showPrimaryAscii) {
    for (const raw of splitLines(asciiArt)) {
      lines.push(centerInWidth(wrap(raw, { fg: "cyan" }), innerWidth));
    }
  }
  if (showSecondaryAscii) {
    for (const raw of FALLBACK_ASCII) {
      lines.push(centerInWidth(wrap(raw, { fg: "cyan" }), innerWidth));
    }
  }
  lines.push(centerInWidth(wrap("★ SOS 团 · 特别活动室终端 ★", { fg: "bright_yellow", bold: true }), innerWidth));
  lines.push(centerInWidth(wrap("━━━━━━━━━━━━━━━━━━━━━━━━━━━━", { fg: "bright_blue" }), innerWidth));
  lines.push(centerInWidth(wrap("无尽八月循环模拟器", { bold: true }), innerWidth));
  lines.push(centerInWidth(wrap("「ただの人間には興味ありません。」", { italic: true, fg: "bright_magenta" }), innerWidth));
  lines.push(centerInWidth(wrap("如果你是外星人、未来人、异世界人或超能力者，就来找我吧。", { dim: true }), innerWidth));
  lines.push("");
  // 菜单边框
  const menuTop = `${wrap("┏━━━━━━━━━━", { fg: "bright_cyan" })}${wrap(" MAIN MENU ", { bold: true })}${wrap("━━━━━━━━━━┓", { fg: "bright_cyan" })}`;
  lines.push(centerInWidth(menuTop, innerWidth));
  const menuItems = [
    [" 1 ", "bright_cyan", "开始新局", "NEW LOOP"],
    [" 2 ", "plum2", "载入存档", "LOAD GAME"],
    [" 3 ", "bright_magenta", "查看帮助", "HELP"],
    [" 4 ", "grey70", "退出游戏", "EXIT"],
  ] as const;
  for (const [tag, bg, label, en] of menuItems) {
    const item =
      wrap(tag, { bg, fg: "black" }) +
      " " +
      wrap(label, { bold: true, fg: "bright_white" }) +
      " " +
      wrap(en, { dim: true });
    lines.push(centerInWidth(item, innerWidth));
  }
  lines.push(centerInWidth(wrap("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛", { fg: "bright_cyan" }), innerWidth));
  return renderPanel(lines.join("\n"), width, {
    title: "Haruhi Loop · Endless August",
    borderColor: "bright_cyan",
    titleColor: "bright_cyan",
  });
}
