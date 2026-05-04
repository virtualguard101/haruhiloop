// 与 view.py make_step_panel 1:1 对齐：narrative / numeric 双模式。

import { StepRecord } from "../../../domain/models";
import {
  MUTATION_PROFILE_KEY_LABELS,
  formatEndingSummary,
} from "../../../narrative/i18n";
import { renderPanel } from "./panel";
import { wrap } from "./ansi";

function narrativeChange(prev: number, current: number, up: string, down: string, flat: string): string {
  if (current > prev) return up;
  if (current < prev) return down;
  return flat;
}

export function renderStepPanel(
  record: StepRecord,
  narrativeMode: boolean,
  width: number,
): string[] {
  const lines: string[] = [
    `场景：${record.scene_label}`,
    `选择：${record.choice_label}`,
  ];
  if (record.action_flavor) {
    lines.push(record.action_flavor.trim());
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
    lines.push(
      "阶段变化：",
      `· 春日情绪：${narrativeChange(sb, sa, "有所回升", "明显下滑", "维持原状")}`,
      `· 世界状态：${narrativeChange(tb, ta, "趋于稳定", "出现裂痕", "暂无变化")}`,
      `· 线索推进：${narrativeChange(cb, ca, "有新进展", "线索受阻", "推进停滞")}`,
      `· 长门负担：${narrativeChange(nb, na, "进一步加重", "略有缓和", "保持不变")}`,
    );
  } else {
    lines.push(
      `变化 | 春日满意度：${snapValue(record.before, "satisfaction")} → ${snapValue(record.after, "satisfaction")}`,
      `变化 | 世界稳定度：${snapValue(record.before, "stability")} → ${snapValue(record.after, "stability")}`,
      `变化 | 线索点数：${snapValue(record.before, "clue_points")} → ${snapValue(record.after, "clue_points")}`,
      `变化 | 长门疲劳：${numFromSnap(record.before, "nagato_fatigue", 0)} → ${numFromSnap(record.after, "nagato_fatigue", 0)}`,
    );
  }
  if (record.mutation_profile && !narrativeMode) {
    const p = record.mutation_profile;
    const sk = MUTATION_PROFILE_KEY_LABELS["satisfaction_factor"] ?? "情绪系数";
    const tk = MUTATION_PROFILE_KEY_LABELS["stability_factor"] ?? "稳定系数";
    const ck = MUTATION_PROFILE_KEY_LABELS["clue_factor"] ?? "线索系数";
    lines.push(
      `扰动系数 | ${sk}x${(p.satisfaction_factor ?? 1).toFixed(2)} ` +
        `${tk}x${(p.stability_factor ?? 1).toFixed(2)} ` +
        `${ck}x${(p.clue_factor ?? 1).toFixed(2)}`,
    );
  }
  if (record.events.length > 0) {
    lines.push("触发事件：");
    for (const ev of record.events) lines.push(`· ${ev}`);
  }
  if (record.ending_id) {
    const zh = formatEndingSummary(record.ending_id);
    lines.push(`触发结局：${zh}`);
    const ep = record.after?.["ending_epilogue"];
    if (ep) {
      lines.push("");
      lines.push(wrap("结局剧情", { bold: true }));
      lines.push(String(ep));
    }
  }
  return renderPanel(lines.join("\n"), width, {
    title: `第 ${record.step_number} 步`,
    borderColor: "yellow",
    titleColor: "yellow",
  });
}

function snapValue(snap: Record<string, unknown>, key: string): string {
  return String(snap[key] ?? 0);
}

function numFromSnap(snap: Record<string, unknown>, key: string, fallback: number): number {
  const v = snap[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^-?\d+/.test(v)) return parseInt(v, 10);
  return fallback;
}
