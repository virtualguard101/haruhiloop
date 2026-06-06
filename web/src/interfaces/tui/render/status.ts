// 与 view.py 中 make_metric_table / make_metric_table_hybrid /
// make_worldline_status_panel 等价。Web 端做的视觉强化：
//   - worldline 标签用 bright cyan，数值用 bright yellow，
//     transition / rewind 用 bright magenta，区分清楚"标签 / 值 / 状态机"
//   - hybrid 表的"档位"列含色彩（绿色 = 良好，黄色 = 中性，红色 = 危险）

import { GameState } from "../../../domain/models";
import {
  bandClueProgress,
  bandCrewSync,
  bandNagatoFatigue,
  bandSatisfaction,
  bandStability,
  formatEndingSummary,
  formatFlags,
  formatHomeworkParts,
  formatMutatorMode,
  formatTimeslot,
  formatTrend,
} from "../../../narrative/i18n";
import { renderPanel } from "./panel";
import { renderTable } from "./table";
import { QuoteVisualState } from "./quote";
import { centerInWidth, wrap } from "./ansi";

function trendSuffix(prev: number | null, current: number, showFlat = false): string {
  const t = formatTrend(prev ?? null, current);
  if (t === "初始") return "";
  if (t === "持平" && !showFlat) return "";
  // 上升用绿色、下降用红色、持平用 dim
  let color = "bright_black";
  if (t === "上升") color = "green";
  else if (t === "下降") color = "red";
  return wrap(`（${t}）`, { fg: color });
}

// 给"档位"文字根据语义着色
function bandColor(text: string): string {
  // 简单策略：含 "稳定/良好/平稳/积极/有进展/亢奋/活跃" 等正向词 → green；
  // 含 "危险/失衡/低迷/受阻/疲态/疲惫/濒临/混乱" 等负向词 → red；
  // 其余 → yellow（中性）。
  const positive = /稳定|良好|平稳|积极|进展|活跃|高昂|充裕|充沛|协同/;
  const negative = /危险|失衡|低迷|受阻|疲态|疲惫|濒临|混乱|不安|低落|裂痕|崩坏|崩裂|薄弱/;
  if (positive.test(text)) return wrap(text, { fg: "green", bold: true });
  if (negative.test(text)) return wrap(text, { fg: "red", bold: true });
  return wrap(text, { fg: "yellow" });
}

export function renderMetricTable(state: GameState, width: number): string[] {
  const ts = formatTimeslot(state.timeslot_index === 0 ? "morning" : state.timeslot_index === 1 ? "afternoon" : "evening");
  const rows: string[][] = [
    ["循环周目", String(state.loop_count)],
    ["春日满意度", colorByThreshold(state.satisfaction, [60, 35])],
    ["世界稳定度", colorByThreshold(state.stability, [55, 30])],
    ["线索点数", wrap(String(state.clue_points), { fg: "bright_white" })],
    ["作业进度", `${state.homework_progress}/3`],
  ];
  if (state.homework_parts_done.length > 0) {
    rows.push(["作业环节", formatHomeworkParts(state.homework_parts_done)]);
  }
  rows.push(
    ["团员协同", colorByThreshold(state.crew_sync, [55, 30])],
    ["闭锁空间次数", String(state.closed_space_count)],
    ["闭锁空间阶段", state.closed_space_stage > 0
      ? wrap(String(state.closed_space_stage), { fg: "red", bold: true })
      : String(state.closed_space_stage)],
  );
  const r = state.memory_residue;
  rows.push([
    "记忆残留",
    `索效+${r["clue_efficiency"] ?? 0} / 协同恢复+${r["sync_recovery"] ?? 0}`,
  ]);
  rows.push(
    ["扰动模式", wrap(formatMutatorMode(state.mutator_mode), { fg: "bright_cyan" })],
    ["世界线偏移", state.worldline_shift > 0
      ? wrap(String(state.worldline_shift), { fg: "bright_magenta" })
      : String(state.worldline_shift)],
    ["长门疲劳度", colorByThresholdReverse(state.nagato_fatigue, [55, 80])],
  );
  if (state.flags.size > 0) {
    rows.push(["叙事标记", formatFlags(state.flags)]);
  }
  if (state.ending_id) {
    const zh = formatEndingSummary(state.ending_id);
    const etitle = (state.ending_title ?? "").trim();
    rows.push(["结局", wrap(etitle || zh, { fg: "bright_yellow", bold: true })]);
  }
  return renderTable(
    {
      title: `运行 ${state.run_id} | 第 ${state.day} 天 · ${ts}`,
      columns: [
        { header: "指标" },
        { header: "数值", align: "right" },
      ],
      rows,
      borderColor: "cyan",
      titleColor: "cyan",
    },
    width,
  );
}

export function renderMetricTableHybrid(
  state: GameState,
  prev: GameState | null,
  width: number,
): string[] {
  const ts = formatTimeslot(state.timeslot_index === 0 ? "morning" : state.timeslot_index === 1 ? "afternoon" : "evening");
  const rows: string[][] = [];
  rows.push([
    "循环周目",
    `第 ${wrap(String(state.loop_count), { fg: "bright_white", bold: true })} 周目${trendSuffix(prev?.loop_count ?? null, state.loop_count)}`,
  ]);
  rows.push([
    "春日状态",
    `${bandColor(bandSatisfaction(state.satisfaction))}${trendSuffix(prev?.satisfaction ?? null, state.satisfaction)}`,
  ]);
  rows.push([
    "世界状态",
    `${bandColor(bandStability(state.stability))}${trendSuffix(prev?.stability ?? null, state.stability)}`,
  ]);
  rows.push([
    "线索推进",
    `${bandColor(bandClueProgress(state.clue_points))}${trendSuffix(prev?.clue_points ?? null, state.clue_points)}`,
  ]);
  rows.push([
    "团员协同",
    `${bandColor(bandCrewSync(state.crew_sync))}${trendSuffix(prev?.crew_sync ?? null, state.crew_sync)}`,
  ]);
  rows.push([
    "长门状态",
    `${bandColor(bandNagatoFatigue(state.nagato_fatigue))}${trendSuffix(prev?.nagato_fatigue ?? null, state.nagato_fatigue)}`,
  ]);
  rows.push([
    "作业进度",
    `${state.homework_progress}/3${trendSuffix(prev?.homework_progress ?? null, state.homework_progress)}`,
  ]);
  if (state.homework_parts_done.length > 0) {
    rows.push(["作业环节", formatHomeworkParts(state.homework_parts_done)]);
  }
  if (state.flags.size > 0) {
    rows.push(["叙事标记", formatFlags(state.flags)]);
  }
  if (state.ending_id) {
    const zh = formatEndingSummary(state.ending_id);
    const etitle = (state.ending_title ?? "").trim();
    rows.push(["结局", wrap(etitle || zh, { fg: "bright_yellow", bold: true })]);
  }
  return renderTable(
    {
      title: `运行 ${state.run_id} | 第 ${state.day} 天 · ${ts}（混合叙事）`,
      columns: [{ header: "状态" }, { header: "观察", align: "right" }],
      rows,
      borderColor: "magenta",
      titleColor: "magenta",
    },
    width,
  );
}

// 数值越大越好的着色（≥ high → 绿，≥ low → 黄，否则红）。
function colorByThreshold(value: number, thresholds: [number, number]): string {
  const [high, low] = thresholds;
  if (value >= high) return wrap(String(value), { fg: "green", bold: true });
  if (value >= low) return wrap(String(value), { fg: "yellow" });
  return wrap(String(value), { fg: "red", bold: true });
}

// 数值越小越好的着色（≤ low → 绿，≤ high → 黄，否则红）。
function colorByThresholdReverse(value: number, thresholds: [number, number]): string {
  const [low, high] = thresholds;
  if (value <= low) return wrap(String(value), { fg: "green" });
  if (value <= high) return wrap(String(value), { fg: "yellow" });
  return wrap(String(value), { fg: "red", bold: true });
}

export function renderWorldlineStatusPanel(
  visual: QuoteVisualState,
  width: number,
): string[] {
  const seconds = visual.day * 60 + visual.clock_tick;
  const shown = visual.clock_tick % 5 === 0 ? seconds - 1 : seconds;
  const reverseMark = visual.clock_tick % 5 === 0;
  // 单行排版：标签 + 值，标签 dim cyan，值 bright yellow
  const seg = (label: string, value: string, valColor = "bright_yellow"): string =>
    `${wrap(label, { fg: "cyan", dim: true })}${wrap(" ", {})}${wrap(value, { fg: valColor, bold: true })}`;
  const sep = wrap("│", { fg: "bright_black" });
  const parts = [
    seg("LOOP", pad(visual.loop_count, 3)),
    seg("DAY", pad(visual.day, 3)),
    seg("T+", `${pad(shown, 4)}s`) +
      (reverseMark ? wrap(" « rewind", { fg: "bright_magenta", italic: true }) : ""),
    seg("SHIFT", pad(visual.worldline_shift, 3)),
  ];
  if (visual.transition_frames > 0) {
    parts.push(wrap("⟡ TRANSITION", { fg: "bright_magenta", bold: true }));
  }
  const line = parts.join(`  ${sep}  `);
  const innerWidth = Math.max(2, width - 4);
  const centered = centerInWidth(line, innerWidth);
  return renderPanel(centered, width, { title: "观测层", borderColor: "blue", titleColor: "blue", align: "left" });
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}
