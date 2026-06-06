// ANSI 颜色与样式常量，对齐 Rich 的颜色名。
// 所有面板都通过 wrap(...) 包装序列；xterm.js 直接渲染。

export const RESET = "\x1b[0m";

const FG: Record<string, string> = {
  default: "39",
  black: "30",
  red: "31",
  green: "32",
  yellow: "33",
  blue: "34",
  magenta: "35",
  cyan: "36",
  white: "37",
  bright_black: "90",
  bright_red: "91",
  bright_green: "92",
  bright_yellow: "93",
  bright_blue: "94",
  bright_magenta: "95",
  bright_cyan: "96",
  bright_white: "97",
  // Rich 的近似 256 色
  plum2: "38;5;183",
  grey70: "38;5;249",
  dim: "2",
};

const BG: Record<string, string> = {
  default: "49",
  black: "40",
  bright_cyan: "106",
  plum2: "48;5;183",
  grey70: "48;5;249",
  bright_magenta: "105",
  bright_yellow: "103",
};

export interface StyleSpec {
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  reverse?: boolean;
  dim?: boolean;
  underline?: boolean;
}

export function style(spec: StyleSpec): string {
  const parts: string[] = [];
  if (spec.bold) parts.push("1");
  if (spec.dim) parts.push("2");
  if (spec.italic) parts.push("3");
  if (spec.underline) parts.push("4");
  if (spec.reverse) parts.push("7");
  if (spec.fg && FG[spec.fg]) parts.push(FG[spec.fg]!);
  if (spec.bg && BG[spec.bg]) parts.push(BG[spec.bg]!);
  if (parts.length === 0) return "";
  return `\x1b[${parts.join(";")}m`;
}

export function wrap(text: string, spec: StyleSpec): string {
  const open = style(spec);
  if (!open) return text;
  return `${open}${text}${RESET}`;
}

// 统计可见宽度（中日韩全角字符 = 2，半角 = 1，控制序列忽略）。
export function visibleWidth(text: string): number {
  let width = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\x1b") {
      const idx = text.indexOf("m", i);
      if (idx === -1) break;
      i = idx + 1;
      continue;
    }
    const code = text.codePointAt(i)!;
    width += isWide(code) ? 2 : 1;
    i += code > 0xffff ? 2 : 1;
  }
  return width;
}

export function isWide(cp: number): boolean {
  // 与 xterm.js 的 Unicode 11 宽度判定主要段对齐：所有 East Asian
  // Wide / Fullwidth 字符算 2 列。Ambiguous（A）类按 1 列，与 xterm
  // 默认行为一致。覆盖范围参照 UnicodeV11.ts。
  if (cp < 0x1100) return false;
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    cp === 0x231a || cp === 0x231b ||
    cp === 0x2329 || cp === 0x232a ||
    (cp >= 0x23e9 && cp <= 0x23ec) || cp === 0x23f0 || cp === 0x23f3 ||
    (cp >= 0x25fd && cp <= 0x25fe) ||
    (cp >= 0x2614 && cp <= 0x2615) ||
    (cp >= 0x2648 && cp <= 0x2653) ||
    cp === 0x267f || cp === 0x2693 || cp === 0x26a1 ||
    (cp >= 0x26aa && cp <= 0x26ab) ||
    (cp >= 0x26bd && cp <= 0x26be) ||
    (cp >= 0x26c4 && cp <= 0x26c5) ||
    cp === 0x26ce || cp === 0x26d4 || cp === 0x26ea ||
    (cp >= 0x26f2 && cp <= 0x26f3) || cp === 0x26f5 ||
    cp === 0x26fa || cp === 0x26fd ||
    cp === 0x2705 ||
    (cp >= 0x270a && cp <= 0x270b) || cp === 0x2728 ||
    cp === 0x274c || cp === 0x274e ||
    (cp >= 0x2753 && cp <= 0x2755) || cp === 0x2757 ||
    (cp >= 0x2795 && cp <= 0x2797) || cp === 0x27b0 || cp === 0x27bf ||
    (cp >= 0x2b1b && cp <= 0x2b1c) || cp === 0x2b50 || cp === 0x2b55 ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xa960 && cp <= 0xa97c) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe52) ||
    (cp >= 0xfe54 && cp <= 0xfe66) ||
    (cp >= 0xfe68 && cp <= 0xfe6b) ||
    (cp >= 0xff01 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x16fe0 && cp <= 0x16fe4) ||
    (cp >= 0x17000 && cp <= 0x187f7) ||
    (cp >= 0x18800 && cp <= 0x18cd5) ||
    (cp >= 0x1b000 && cp <= 0x1b11e) ||
    (cp >= 0x1b150 && cp <= 0x1b152) ||
    (cp >= 0x1b164 && cp <= 0x1b167) ||
    (cp >= 0x1b170 && cp <= 0x1b2fb) ||
    cp === 0x1f004 || cp === 0x1f0cf || cp === 0x1f18e ||
    (cp >= 0x1f191 && cp <= 0x1f19a) ||
    (cp >= 0x1f200 && cp <= 0x1f320) ||
    (cp >= 0x1f32d && cp <= 0x1f335) ||
    (cp >= 0x1f337 && cp <= 0x1f37c) ||
    (cp >= 0x1f37e && cp <= 0x1f393) ||
    (cp >= 0x1f3a0 && cp <= 0x1f3ca) ||
    (cp >= 0x1f3cf && cp <= 0x1f3d3) ||
    (cp >= 0x1f3e0 && cp <= 0x1f3f0) ||
    cp === 0x1f3f4 ||
    (cp >= 0x1f3f8 && cp <= 0x1f43e) || cp === 0x1f440 ||
    (cp >= 0x1f442 && cp <= 0x1f4fc) ||
    (cp >= 0x1f4ff && cp <= 0x1f53d) ||
    (cp >= 0x1f54b && cp <= 0x1f54e) ||
    (cp >= 0x1f550 && cp <= 0x1f567) ||
    cp === 0x1f57a ||
    (cp >= 0x1f595 && cp <= 0x1f596) ||
    cp === 0x1f5a4 ||
    (cp >= 0x1f5fb && cp <= 0x1f64f) ||
    (cp >= 0x1f680 && cp <= 0x1f6c5) ||
    cp === 0x1f6cc ||
    (cp >= 0x1f6d0 && cp <= 0x1f6d2) ||
    (cp >= 0x1f6d5 && cp <= 0x1f6d7) ||
    (cp >= 0x1f6eb && cp <= 0x1f6ec) ||
    (cp >= 0x1f6f4 && cp <= 0x1f6fc) ||
    (cp >= 0x1f7e0 && cp <= 0x1f7eb) ||
    (cp >= 0x1f90c && cp <= 0x1f93a) ||
    (cp >= 0x1f93c && cp <= 0x1f945) ||
    (cp >= 0x1f947 && cp <= 0x1f978) ||
    (cp >= 0x1f97a && cp <= 0x1f9cb) ||
    (cp >= 0x1f9cd && cp <= 0x1f9ff) ||
    (cp >= 0x1fa70 && cp <= 0x1fa74) ||
    (cp >= 0x1fa78 && cp <= 0x1fa7a) ||
    (cp >= 0x1fa80 && cp <= 0x1fa86) ||
    (cp >= 0x1fa90 && cp <= 0x1faa8) ||
    (cp >= 0x1fab0 && cp <= 0x1fab6) ||
    (cp >= 0x1fac0 && cp <= 0x1fac2) ||
    (cp >= 0x1fad0 && cp <= 0x1fad6) ||
    (cp >= 0x20000 && cp <= 0x2fffd) ||
    (cp >= 0x30000 && cp <= 0x3fffd)
  );
}

// 把含可选外层 ANSI 包裹的文本按可见宽度切成多行。
// 假定 ANSI 序列只在最外层（前缀 + 末尾 \x1b[0m）；
// 内部还有其它 ANSI 时退化为单行（由 sliceByVisibleWidth 安全截断）。
export function wrapToWidth(text: string, width: number): string[] {
  if (width <= 0) return [text];
  if (visibleWidth(text) <= width) return [text];
  const prefixMatch = text.match(/^(?:\x1b\[[0-9;]*m)+/);
  const prefix = prefixMatch ? prefixMatch[0] : "";
  let body = prefix ? text.slice(prefix.length) : text;
  let suffix = "";
  if (body.endsWith(RESET)) {
    suffix = RESET;
    body = body.slice(0, body.length - suffix.length);
  }
  if (body.includes("\x1b")) {
    // 内部仍含 ANSI，难以稳健切分；安全起见单行截断。
    return [sliceByVisibleWidth(text, width)];
  }
  const segs: string[] = [];
  let buf = "";
  let bufW = 0;
  let i = 0;
  while (i < body.length) {
    const cp = body.codePointAt(i)!;
    const w = isWide(cp) ? 2 : 1;
    const ch = String.fromCodePoint(cp);
    if (bufW + w > width) {
      segs.push(prefix + buf + suffix);
      buf = ch;
      bufW = w;
    } else {
      buf += ch;
      bufW += w;
    }
    i += cp > 0xffff ? 2 : 1;
  }
  if (buf) segs.push(prefix + buf + suffix);
  return segs.length === 0 ? [""] : segs;
}

// 安全截断：保留 ANSI 序列原样（不计入宽度），可见字符达到 width 即停。
export function sliceByVisibleWidth(text: string, width: number): string {
  if (width <= 0) return "";
  if (visibleWidth(text) <= width) return text;
  let buf = "";
  let bufW = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\x1b") {
      const idx = text.indexOf("m", i);
      if (idx === -1) break;
      buf += text.slice(i, idx + 1);
      i = idx + 1;
      continue;
    }
    const cp = text.codePointAt(i)!;
    const w = isWide(cp) ? 2 : 1;
    if (bufW + w > width) break;
    buf += String.fromCodePoint(cp);
    bufW += w;
    i += cp > 0xffff ? 2 : 1;
  }
  // 收尾 reset，避免遗漏的样式污染后续输出。
  return buf + RESET;
}

export function padRightVisible(text: string, width: number): string {
  const w = visibleWidth(text);
  if (w >= width) return text;
  return text + " ".repeat(width - w);
}

export function centerInWidth(text: string, width: number): string {
  const w = visibleWidth(text);
  if (w >= width) return text;
  const left = Math.floor((width - w) / 2);
  const right = width - w - left;
  return " ".repeat(left) + text + " ".repeat(right);
}

// 把内联多行字符串按行截断/对齐。
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}
