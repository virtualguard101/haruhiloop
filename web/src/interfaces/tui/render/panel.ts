// 与 Rich Panel 默认 ROUNDED 风格对齐：细线圆角 ╭─╮ │ ╰─╯。
// 标题嵌入顶边、左右各 1 列 padding，与 Python 终端 Rich 渲染视觉一致。
//
// box style 切换说明：
//   - default / "rounded": ╭ ─ ╮ │ ╰ ╯  （Rich 默认；用于绝大多数面板）
//   - "heavy":             ┏ ━ ┓ ┃ ┗ ┛  （供 entry / load 装饰条手画 ASCII 时复用）

import {
  centerInWidth,
  padRightVisible,
  sliceByVisibleWidth,
  splitLines,
  style,
  visibleWidth,
  wrap,
  RESET,
} from "./ansi";

export interface PanelOptions {
  title?: string;
  subtitle?: string;
  borderColor?: string;
  titleColor?: string;
  align?: "left" | "center";
  padding?: number;
  /** 边框风格；默认与 Rich Panel 的 ROUNDED 对齐 */
  box?: "rounded" | "heavy";
}

interface BoxChars {
  tl: string;
  tr: string;
  bl: string;
  br: string;
  h: string;
  v: string;
}

const BOX_ROUNDED: BoxChars = { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" };
const BOX_HEAVY: BoxChars = { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" };

function pickBox(b: PanelOptions["box"]): BoxChars {
  return b === "heavy" ? BOX_HEAVY : BOX_ROUNDED;
}

export function renderPanel(body: string, width: number, opts: PanelOptions = {}): string[] {
  const borderColor = opts.borderColor ?? "white";
  const titleColor = opts.titleColor ?? borderColor;
  const padding = opts.padding ?? 1;
  const innerWidth = Math.max(2, width - 2 - padding * 2);
  const box = pickBox(opts.box);

  const open = style({ fg: borderColor });
  const close = RESET;
  const titleRaw = opts.title ?? "";
  const subtitleRaw = opts.subtitle ?? "";

  const top = buildEdgeBorder(width, titleRaw, titleColor, borderColor, box, "top");
  const bottom = buildEdgeBorder(width, subtitleRaw, titleColor, borderColor, box, "bottom");

  const padStr = " ".repeat(padding);
  const linesOut: string[] = [top];
  for (const raw of splitLines(body)) {
    const wrapped = wrapLineToWidth(raw, innerWidth, opts.align ?? "left");
    for (const seg of wrapped) {
      const padded = padRightVisible(seg, innerWidth);
      linesOut.push(`${open}${box.v}${close}${padStr}${padded}${padStr}${open}${box.v}${close}`);
    }
  }
  if (linesOut.length === 1) {
    // 空 body：至少给一行。
    linesOut.push(`${open}${box.v}${close}${padStr}${" ".repeat(innerWidth)}${padStr}${open}${box.v}${close}`);
  }
  linesOut.push(bottom);
  return linesOut;
}

function buildEdgeBorder(
  width: number,
  title: string,
  titleColor: string,
  borderColor: string,
  box: BoxChars,
  side: "top" | "bottom",
): string {
  const open = style({ fg: borderColor });
  const close = RESET;
  const left = side === "top" ? box.tl : box.bl;
  const right = side === "top" ? box.tr : box.br;
  if (!title) {
    return `${open}${left}${box.h.repeat(Math.max(0, width - 2))}${right}${close}`;
  }
  // Rich 风格：标题靠左偏移 1 列，前后用 ── 与边角相连：
  //   ╭── 标题 ──────────────╮
  // title 过长则回退到无标题。
  const titleStyled = wrap(` ${title} `, { fg: titleColor, bold: true });
  const titleVis = visibleWidth(titleStyled);
  const remain = width - 2 - titleVis;
  if (remain < 4) {
    return `${open}${left}${box.h.repeat(Math.max(0, width - 2))}${right}${close}`;
  }
  const leftFill = 2; // Rich 视觉：标题左侧 2 个填充字符
  const rightFill = remain - leftFill;
  return (
    `${open}${left}${box.h.repeat(leftFill)}${close}` +
    `${titleStyled}` +
    `${open}${box.h.repeat(rightFill)}${right}${close}`
  );
}

// 把一行内容裁/居中到指定宽度，永远只产出**一条**物理行，
// 杜绝 panel 内"一行变多行 + 多余 ┃ 漂浮"的视觉问题。
// - 可见宽度不超过 width：可选居中
// - 超过 width：sliceByVisibleWidth 安全截断（保留外层 ANSI 包裹）
function wrapLineToWidth(text: string, width: number, align: "left" | "center"): string[] {
  if (visibleWidth(text) <= width) {
    return [align === "center" ? centerInWidth(text, width) : text];
  }
  return [sliceByVisibleWidth(text, width)];
}

void style;
