// 与 play_app.py _load_panel 视觉对齐：分页存档列表、A/D 翻页、B/Esc 返回。
// Web 端补：装饰横条宽度跟随 innerWidth、空槽位用占位行让分页页面高度稳定、
// 标号 chip 视觉与 entry / help 一致。

import { SaveSlotSummary } from "../../../infrastructure/storage_idb";
import { centerInWidth, visibleWidth, wrap } from "./ansi";
import { renderPanel } from "./panel";

export const PAGE_SIZE = 9;

export function maxLoadPage(slots: readonly SaveSlotSummary[]): number {
  return Math.max(0, Math.ceil(slots.length / PAGE_SIZE) - 1);
}

function buildDeco(label: string, innerWidth: number, color = "bright_cyan"): string {
  const labelStyled = wrap(` ${label} `, { bold: true });
  const labelVis = visibleWidth(labelStyled);
  const targetTotal = Math.min(60, Math.max(28, Math.floor(innerWidth * 0.7)));
  const fill = Math.max(0, targetTotal - labelVis - 2);
  const left = Math.floor(fill / 2);
  const right = fill - left;
  return (
    wrap(`┏${"━".repeat(left)}`, { fg: color }) +
    labelStyled +
    wrap(`${"━".repeat(right)}┓`, { fg: color })
  );
}

function buildDecoBottom(innerWidth: number, color = "bright_cyan"): string {
  const targetTotal = Math.min(60, Math.max(28, Math.floor(innerWidth * 0.7)));
  return wrap("┗" + "━".repeat(Math.max(0, targetTotal - 2)) + "┛", { fg: color });
}

export function renderLoadPanel(
  slots: readonly SaveSlotSummary[],
  page: number,
  width: number,
): string[] {
  const innerWidth = Math.max(2, width - 4);
  const start = page * PAGE_SIZE;
  const visible = slots.slice(start, start + PAGE_SIZE);
  const lines: string[] = [
    centerInWidth(
      wrap("★ SOS 团 · 存档管理终端 ★", { bold: true, fg: "bright_yellow" }),
      innerWidth,
    ),
    centerInWidth(wrap("━".repeat(Math.min(40, innerWidth - 2)), { fg: "bright_blue" }), innerWidth),
    "",
    centerInWidth(buildDeco("LOAD GAME", innerWidth, "bright_magenta"), innerWidth),
    "",
  ];
  if (visible.length === 0) {
    lines.push(centerInWidth(wrap("暂无可加载存档。按 b 返回并选择开始新局。", { dim: true, italic: true }), innerWidth));
  }
  visible.forEach((slot, idx) => {
    const date = slot.modified_at;
    const dateKey = formatDateKey(date);
    let serial = 0;
    for (const each of slots) {
      if (formatDateKey(each.modified_at) === dateKey) serial += 1;
      if (each.run_id === slot.run_id) break;
    }
    const saveNo = `${dateKey}-${String(serial).padStart(2, "0")}`;
    const stateLabel = slot.is_finished
      ? wrap(`结局：${slot.ending_title ?? "已达成"}`, { fg: "bright_yellow" })
      : wrap(`第${slot.day}天 · 第${slot.loop_count}周目`, { fg: "bright_cyan" });
    const stamp = formatDateTime(date);
    const tag = wrap(` ${idx + 1} `, { bg: "plum2", fg: "black", bold: true });
    const item =
      tag +
      "  " +
      wrap(saveNo, { bold: true, fg: "bright_white" }) +
      "  " +
      wrap(stamp, { dim: true }) +
      "  " +
      wrap(`#${slot.run_id}`, { dim: true }) +
      "  " +
      stateLabel;
    lines.push(centerInWidth(item, innerWidth));
  });
  lines.push("");
  lines.push(centerInWidth(buildDecoBottom(innerWidth, "bright_magenta"), innerWidth));
  lines.push("");
  const totalPages = maxLoadPage(slots) + 1;
  const navParts = [
    `${wrap("页码", { dim: true })} ${wrap(`${page + 1}/${totalPages}`, { fg: "bright_white", bold: true })}`,
    `${wrap(" 1–9 ", { bg: "plum2", fg: "black", bold: true })} 加载`,
    `${wrap(" A/D ", { bg: "plum2", fg: "black", bold: true })} 翻页`,
    `${wrap(" B/Esc ", { bg: "plum2", fg: "black", bold: true })} 返回`,
  ];
  lines.push(centerInWidth(navParts.join(`  ${wrap("·", { dim: true })}  `), innerWidth));

  return renderPanel(lines.join("\n"), width, {
    title: "Haruhi Loop · Save Select",
    borderColor: "bright_magenta",
    titleColor: "bright_magenta",
  });
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}
