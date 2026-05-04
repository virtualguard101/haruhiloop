// 与 view.py 中 make_metric_table / make_metric_table_hybrid /
// make_worldline_status_panel 等价。

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
import { centerInWidth, style, RESET, wrap } from "./ansi";

function trendSuffix(prev: number | null, current: number, showFlat = false): string {
  const t = formatTrend(prev ?? null, current);
  if (t === "初始") return "";
  if (t === "持平" && !showFlat) return "";
  return `（${t}）`;
}

export function renderMetricTable(state: GameState, width: number): string[] {
  const ts = formatTimeslot(state.timeslot_index === 0 ? "morning" : state.timeslot_index === 1 ? "afternoon" : "evening");
  const rows: string[][] = [
    ["循环周目", String(state.loop_count)],
    ["春日满意度", String(state.satisfaction)],
    ["世界稳定度", String(state.stability)],
    ["线索点数", String(state.clue_points)],
    ["作业进度", `${state.homework_progress}/3`],
  ];
  if (state.homework_parts_done.length > 0) {
    rows.push(["作业环节", formatHomeworkParts(state.homework_parts_done)]);
  }
  rows.push(
    ["团员协同", String(state.crew_sync)],
    ["闭锁空间次数", String(state.closed_space_count)],
    ["闭锁空间阶段", String(state.closed_space_stage)],
  );
  const r = state.memory_residue;
  rows.push([
    "记忆残留",
    `索效+${r["clue_efficiency"] ?? 0} / 协同恢复+${r["sync_recovery"] ?? 0}`,
  ]);
  rows.push(
    ["扰动模式", formatMutatorMode(state.mutator_mode)],
    ["世界线偏移", String(state.worldline_shift)],
    ["长门疲劳度", String(state.nagato_fatigue)],
  );
  if (state.flags.size > 0) {
    rows.push(["叙事标记", formatFlags(state.flags)]);
  }
  if (state.ending_id) {
    const zh = formatEndingSummary(state.ending_id);
    const etitle = (state.ending_title ?? "").trim();
    rows.push(["结局", etitle || zh]);
    // 结局剧情专门由 step panel 完整展示，不在 metric 里重复 250+ 字长文本，
    // 避免 alt screen 模式下 viewport 被超长 cell 顶到溢出。
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
    `第 ${state.loop_count} 周目${trendSuffix(prev?.loop_count ?? null, state.loop_count)}`,
  ]);
  rows.push([
    "春日状态",
    `${bandSatisfaction(state.satisfaction)}${trendSuffix(prev?.satisfaction ?? null, state.satisfaction)}`,
  ]);
  rows.push([
    "世界状态",
    `${bandStability(state.stability)}${trendSuffix(prev?.stability ?? null, state.stability)}`,
  ]);
  rows.push([
    "线索推进",
    `${bandClueProgress(state.clue_points)}${trendSuffix(prev?.clue_points ?? null, state.clue_points)}`,
  ]);
  rows.push([
    "团员协同",
    `${bandCrewSync(state.crew_sync)}${trendSuffix(prev?.crew_sync ?? null, state.crew_sync)}`,
  ]);
  rows.push([
    "长门状态",
    `${bandNagatoFatigue(state.nagato_fatigue)}${trendSuffix(prev?.nagato_fatigue ?? null, state.nagato_fatigue)}`,
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
    rows.push(["结局", etitle || zh]);
    // 结局剧情专门由 step panel 完整展示，不在 metric 里重复，避免 viewport 被撑爆。
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

export function renderWorldlineStatusPanel(
  visual: QuoteVisualState,
  width: number,
): string[] {
  const seconds = visual.day * 60 + visual.clock_tick;
  const shown = visual.clock_tick % 5 === 0 ? seconds - 1 : seconds;
  const reverseMark = visual.clock_tick % 5 === 0 ? " << rewind" : "";
  let line =
    `WORLDLINE LOOP ${pad(visual.loop_count, 3)} | ` +
    `DAY ${pad(visual.day, 3)} | ` +
    `T+${pad(shown, 4)}s${reverseMark} | ` +
    `SHIFT ${pad(visual.worldline_shift, 3)}`;
  if (visual.transition_frames > 0) line += " | TRANSITION";
  const innerWidth = Math.max(2, width - 4);
  const centered = centerInWidth(line, innerWidth);
  return renderPanel(centered, width, { title: "观测层", borderColor: "blue", align: "left" });
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

void style;
void RESET;
void wrap;
