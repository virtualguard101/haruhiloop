// 与 play_app.py _load_panel 视觉对齐：分页存档列表、A/D 翻页、B/Esc 返回。

import { SaveSlotSummary } from "../../../infrastructure/storage_idb";
import { centerInWidth, wrap } from "./ansi";
import { renderPanel } from "./panel";

export const PAGE_SIZE = 9;

export function maxLoadPage(slots: readonly SaveSlotSummary[]): number {
  return Math.max(0, Math.ceil(slots.length / PAGE_SIZE) - 1);
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
    "",
    centerInWidth(
      `${wrap("┏━━━━━━━━━━", { fg: "bright_cyan" })}${wrap(" LOAD GAME ", { bold: true })}${wrap("━━━━━━━━━━┓", { fg: "bright_cyan" })}`,
      innerWidth,
    ),
  ];
  if (visible.length === 0) {
    lines.push(centerInWidth(wrap("暂无可加载存档。按 b 返回并选择开始新局。", { dim: true }), innerWidth));
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
      ? `结局：${slot.ending_title ?? "已达成"}`
      : `第${slot.day}天 · 第${slot.loop_count}周目`;
    const stamp = formatDateTime(date);
    const item =
      wrap(` ${idx + 1} `, { bg: "plum2", fg: "black" }) +
      " " +
      wrap(saveNo, { bold: true, fg: "bright_white" }) +
      " " +
      wrap(`${stamp} · ${slot.run_id} · ${stateLabel}`, { dim: true });
    lines.push(centerInWidth(item, innerWidth));
  });
  lines.push(
    centerInWidth(
      wrap("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛", { fg: "bright_cyan" }),
      innerWidth,
    ),
  );
  const totalPages = maxLoadPage(slots) + 1;
  lines.push(
    centerInWidth(
      wrap(
        `页码 ${page + 1}/${totalPages} · 1-9 加载 · A/D 翻页 · B 或 Esc 返回`,
        { dim: true },
      ),
      innerWidth,
    ),
  );

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
