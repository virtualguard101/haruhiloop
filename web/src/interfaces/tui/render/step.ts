// 与 view.py make_step_panel 1:1 对齐：narrative / numeric 双模式。
// narrative 模式下变化方向用色彩区分（上行绿 / 下行红 / 持平灰），
// 让肉眼能在一眼之内找到"哪里在变好、哪里在变坏"。

import { StepRecord } from "../../../domain/models";
import {
  MUTATION_PROFILE_KEY_LABELS,
  formatEndingSummary,
} from "../../../narrative/i18n";
import { renderPanel } from "./panel";
import { wrap } from "./ansi";

type Direction = "up" | "down" | "flat";

function direction(prev: number, current: number): Direction {
  if (current > prev) return "up";
  if (current < prev) return "down";
  return "flat";
}

function colorize(dir: Direction, text: string): string {
  if (dir === "up") return wrap(text, { fg: "green", bold: true });
  if (dir === "down") return wrap(text, { fg: "red", bold: true });
  return wrap(text, { fg: "bright_black" });
}

function narrativeLine(label: string, prev: number, cur: number, copy: { up: string; down: string; flat: string }): string {
  const dir = direction(prev, cur);
  const phrase = dir === "up" ? copy.up : dir === "down" ? copy.down : copy.flat;
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "·";
  return `${wrap(arrow, dir === "up" ? { fg: "green" } : dir === "down" ? { fg: "red" } : { fg: "bright_black" })} ${label}：${colorize(dir, phrase)}`;
}

export function renderStepPanel(
  record: StepRecord,
  narrativeMode: boolean,
  width: number,
): string[] {
  const lines: string[] = [
    `${wrap("场景", { bold: true, fg: "cyan" })}　${record.scene_label}`,
    `${wrap("选择", { bold: true, fg: "cyan" })}　${record.choice_label}`,
  ];
  if (record.action_flavor) {
    lines.push("");
    lines.push(wrap(record.action_flavor.trim(), { italic: true, fg: "bright_white" }));
  }
  if (narrativeMode) {
    const sb = numFromSnap(record.before, "satisfaction", 0);
    const sa = numFromSnap(record.after, "satisfaction", sb);
    const tb = numFromSnap(record.before, "stability", 0);
    const ta = numFromSnap(record.after, "stability", tb);
    const cb = numFromSnap(record.before, "clue_points", 0);
    const ca = numFromSnap(record.after, "clue_points", cb);
    const nb = numFromSnap(record.before, "nagato_fatigue", 0);
    const na = numFromSnap(record.after, "nagato_fatigue", nb);
    lines.push("");
    lines.push(wrap("阶段变化", { bold: true, fg: "magenta" }));
    lines.push(narrativeLine("春日情绪", sb, sa, { up: "有所回升", down: "明显下滑", flat: "维持原状" }));
    lines.push(narrativeLine("世界状态", tb, ta, { up: "趋于稳定", down: "出现裂痕", flat: "暂无变化" }));
    lines.push(narrativeLine("线索推进", cb, ca, { up: "有新进展", down: "线索受阻", flat: "推进停滞" }));
    // 长门疲劳是"越低越好"——上升 = 负向，下降 = 正向，需要反转色彩。
    lines.push(narrativeLineNagato(nb, na));
  } else {
    lines.push("");
    lines.push(wrap("数值变化", { bold: true, fg: "magenta" }));
    lines.push(numericLine("春日满意度", record.before, record.after, "satisfaction"));
    lines.push(numericLine("世界稳定度", record.before, record.after, "stability"));
    lines.push(numericLine("线索点数", record.before, record.after, "clue_points"));
    lines.push(numericLineNagato(record.before, record.after));
  }
  if (record.mutation_profile && !narrativeMode) {
    const p = record.mutation_profile;
    const sk = MUTATION_PROFILE_KEY_LABELS["satisfaction_factor"] ?? "情绪系数";
    const tk = MUTATION_PROFILE_KEY_LABELS["stability_factor"] ?? "稳定系数";
    const ck = MUTATION_PROFILE_KEY_LABELS["clue_factor"] ?? "线索系数";
    lines.push("");
    lines.push(
      `${wrap("扰动系数", { bold: true, fg: "yellow" })}　` +
        `${sk}${wrap("×", { dim: true })}${(p.satisfaction_factor ?? 1).toFixed(2)}　` +
        `${tk}${wrap("×", { dim: true })}${(p.stability_factor ?? 1).toFixed(2)}　` +
        `${ck}${wrap("×", { dim: true })}${(p.clue_factor ?? 1).toFixed(2)}`,
    );
  }
  if (record.events.length > 0) {
    lines.push("");
    lines.push(wrap("触发事件", { bold: true, fg: "yellow" }));
    for (const ev of record.events) lines.push(`${wrap("·", { fg: "yellow" })} ${ev}`);
  }
  if (record.ending_id) {
    const zh = formatEndingSummary(record.ending_id);
    lines.push("");
    lines.push(`${wrap("触发结局", { bold: true, fg: "bright_yellow" })}　${wrap(zh, { fg: "bright_yellow" })}`);
    const ep = record.after?.["ending_epilogue"];
    if (ep) {
      lines.push("");
      lines.push(wrap("结局剧情", { bold: true, fg: "bright_magenta" }));
      lines.push(wrap(String(ep), { italic: true }));
    }
  }
  return renderPanel(lines.join("\n"), width, {
    title: `第 ${record.step_number} 步`,
    borderColor: "yellow",
    titleColor: "yellow",
  });
}

function numericLine(label: string, before: Record<string, unknown>, after: Record<string, unknown>, key: string): string {
  const b = numFromSnap(before, key, 0);
  const a = numFromSnap(after, key, b);
  const diff = a - b;
  const dir: Direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "·";
  const arrowStyled =
    dir === "up" ? wrap(arrow, { fg: "green" }) :
    dir === "down" ? wrap(arrow, { fg: "red" }) :
    wrap(arrow, { fg: "bright_black" });
  const numA = colorize(dir, String(a));
  return `${arrowStyled} ${label}：${b} ${wrap("→", { dim: true })} ${numA}`;
}

// 长门疲劳：上升 = 负面 → 红，下降 = 正面 → 绿，持平 → 灰。
function numericLineNagato(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const b = numFromSnap(before, "nagato_fatigue", 0);
  const a = numFromSnap(after, "nagato_fatigue", b);
  const diff = a - b;
  const dir: Direction = diff > 0 ? "down" : diff < 0 ? "up" : "flat";
  const arrowChar = diff > 0 ? "↑" : diff < 0 ? "↓" : "·";
  const arrowStyled =
    dir === "up" ? wrap(arrowChar, { fg: "green" }) :
    dir === "down" ? wrap(arrowChar, { fg: "red" }) :
    wrap(arrowChar, { fg: "bright_black" });
  const numA = colorize(dir, String(a));
  return `${arrowStyled} 长门疲劳：${b} ${wrap("→", { dim: true })} ${numA}`;
}

function narrativeLineNagato(prev: number, cur: number): string {
  // 长门疲劳越高越糟：上升 = 负面，下降 = 正面，反转颜色。
  const diff = cur - prev;
  const dir: Direction = diff > 0 ? "down" : diff < 0 ? "up" : "flat";
  const phrase = diff > 0 ? "进一步加重" : diff < 0 ? "略有缓和" : "保持不变";
  const arrow = diff > 0 ? "▼" : diff < 0 ? "▲" : "·";
  const arrowStyled =
    dir === "up" ? wrap(arrow, { fg: "green" }) :
    dir === "down" ? wrap(arrow, { fg: "red" }) :
    wrap(arrow, { fg: "bright_black" });
  return `${arrowStyled} 长门负担：${colorize(dir, phrase)}`;
}

function numFromSnap(snap: Record<string, unknown>, key: string, fallback: number): number {
  const v = snap[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^-?\d+/.test(v)) return parseInt(v, 10);
  return fallback;
}
