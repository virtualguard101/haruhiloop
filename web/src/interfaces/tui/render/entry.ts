// 与 play_app.py _entry_panel 视觉对齐：ASCII + SOS 团口号 + 4 项菜单。
// Web 端额外做的：菜单宽度跟随 innerWidth 自适应、按键 chip 视觉与 help 一致、
// 副标题分行排版减少视觉拥挤。

import { centerInWidth, splitLines, visibleWidth, wrap } from "./ansi";
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

// 动态构造一段居中装饰条："━━━━━ MAIN MENU ━━━━━"，让宽度跟随
// innerWidth；这样窄/宽屏下不会出现"装饰条溢出"或"装饰条远短于面板"的视觉断层。
function buildDeco(label: string, innerWidth: number): string {
  const labelStyled = wrap(` ${label} `, { bold: true });
  const labelVis = visibleWidth(labelStyled);
  // 让装饰条总宽度大约占 innerWidth 的 70%（最少 28，最多 60）
  const targetTotal = Math.min(60, Math.max(28, Math.floor(innerWidth * 0.7)));
  const fill = Math.max(0, targetTotal - labelVis - 2);
  const left = Math.floor(fill / 2);
  const right = fill - left;
  return (
    wrap(`┏${"━".repeat(left)}`, { fg: "bright_cyan" }) +
    labelStyled +
    wrap(`${"━".repeat(right)}┓`, { fg: "bright_cyan" })
  );
}

function buildDecoBottom(innerWidth: number): string {
  // 与 buildDeco 顶端宽度对齐
  const targetTotal = Math.min(60, Math.max(28, Math.floor(innerWidth * 0.7)));
  return wrap("┗" + "━".repeat(Math.max(0, targetTotal - 2)) + "┛", { fg: "bright_cyan" });
}

export function renderEntryPanel(
  asciiArt: string,
  width: number,
  rows = Number.POSITIVE_INFINITY,
): string[] {
  const innerWidth = Math.max(2, width - 4);
  const lines: string[] = [];
  // viewport 较矮时只画一份 ASCII；极矮（< 24）时跳过 ASCII 只保留口号 + 菜单。
  const showSecondaryAscii = rows >= 50;
  const showPrimaryAscii = rows >= 24;
  const primaryLines = splitLines(asciiArt);
  const primaryMax = primaryLines.reduce((m, l) => Math.max(m, visibleWidth(l)), 0);
  const fallbackMax = FALLBACK_ASCII.reduce((m, l) => Math.max(m, visibleWidth(l)), 0);
  if (showPrimaryAscii && primaryMax <= innerWidth) {
    for (const raw of primaryLines) {
      lines.push(centerInWidth(wrap(raw, { fg: "cyan" }), innerWidth));
    }
  }
  if (showSecondaryAscii && fallbackMax <= innerWidth) {
    if (lines.length > 0) lines.push("");
    for (const raw of FALLBACK_ASCII) {
      lines.push(centerInWidth(wrap(raw, { fg: "bright_cyan", bold: true }), innerWidth));
    }
  }
  if (lines.length > 0) lines.push("");
  // 主标题 + 装饰横条
  lines.push(centerInWidth(wrap("★ SOS 团 · 特别活动室终端 ★", { fg: "bright_yellow", bold: true }), innerWidth));
  lines.push(centerInWidth(wrap("━".repeat(Math.min(40, innerWidth - 2)), { fg: "bright_blue" }), innerWidth));
  lines.push(centerInWidth(wrap("无尽八月循环模拟器", { bold: true, fg: "bright_white" }), innerWidth));
  lines.push("");
  lines.push(centerInWidth(wrap("「ただの人間には興味ありません。」", { italic: true, fg: "bright_magenta" }), innerWidth));
  lines.push(centerInWidth(wrap("如果你是外星人、未来人、异世界人或超能力者，就来找我吧。", { dim: true, italic: true }), innerWidth));
  lines.push("");
  // 菜单边框
  lines.push(centerInWidth(buildDeco("MAIN MENU", innerWidth), innerWidth));
  lines.push("");
  const menuItems = [
    [" 1 ", "bright_cyan", "开始新局", "NEW LOOP"],
    [" 2 ", "plum2", "载入存档", "LOAD GAME"],
    [" 3 ", "bright_magenta", "查看帮助", "HELP"],
    [" 4 ", "grey70", "退出游戏", "EXIT"],
  ] as const;
  for (const [tag, bg, label, en] of menuItems) {
    const item =
      wrap(tag, { bg, fg: "black", bold: true }) +
      "  " +
      wrap(label, { bold: true, fg: "bright_white" }) +
      "  " +
      wrap(en, { dim: true });
    lines.push(centerInWidth(item, innerWidth));
  }
  lines.push("");
  lines.push(centerInWidth(buildDecoBottom(innerWidth), innerWidth));
  lines.push("");
  lines.push(centerInWidth(wrap("使用数字键 1–4 选择，或按 Enter 直接开始新局", { dim: true }), innerWidth));
  return renderPanel(lines.join("\n"), width, {
    title: "Haruhi Loop · Endless August",
    borderColor: "bright_cyan",
    titleColor: "bright_cyan",
  });
}
