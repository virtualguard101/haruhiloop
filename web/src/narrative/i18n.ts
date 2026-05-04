// 与 src/haruhiloop_cli/i18n.py 1:1 对齐：标签字典、format_*、band_*、format_trend。

import { EventOutcome } from "../domain/models";

export const TIMESLOT_LABELS: Record<string, string> = {
  day: "全天",
  morning: "早晨",
  afternoon: "午后",
  evening: "傍晚",
};

export const FLAG_LABELS: Record<string, string> = {
  anomaly_seen: "已察觉异常",
  clue_chain_started: "线索链已展开",
  festival_plan: "惊喜活动计划",
  homework_done: "暑假作业已完成",
  truth_shared: "已向众人揭示循环",
  haruhi_calmed: "已安抚春日情绪",
  closed_space_active: "闭锁空间展开中",
  closed_space_resolved: "闭锁空间已抑制",
  hope_signal: "希望信号",
};

export const ENDING_SUMMARY_LABELS: Record<string, string> = {
  haruhi_happy_new_world: "晴空下的新周目",
  consensus_paradise: "共识温室",
  kyon_breaks_loop: "切口与回声",
  meltdown_pact: "真相暴晒协议",
  hollow_celebration: "空洞庆典",
  archive_bound: "归档囚徒",
  observer_bailout: "观测者脱钩",
  shinirappears_unstable_world: "结构体崩解",
  nagato_collapse: "长门有希的崩坏",
  unknown: "未知结局",
};

export const EVENT_NAMES_ZH: Record<string, string> = {
  boredom_spike: "重复日常引发的厌倦",
  day_end_drift: "一日将尽的摩擦余波",
  restless_search: "低落情绪下的可疑绕行",
  sync_without_alignment: "协同不足导致同步失效",
  homework_progress: "作业进度推进",
  homework_completed: "作业全部完成",
  homework_pressure: "作业压力累积",
  homework_already_done: "作业复盘余量",
  closed_space_stage: "闭锁空间危机阶段",
  closed_space_countermeasure: "闭锁空间应对",
  hope_signal: "希望信号",
  crew_sync_breakthrough: "团员协同突破",
  crew_sync_friction: "团员协同摩擦",
};

export const HOMEWORK_PART_LABELS: Record<string, string> = {
  worksheet: "习题演算",
  essay: "读书笔记",
  submission: "集中提交",
};

export const MUTATOR_MODE_LABELS: Record<string, string> = {
  ai: "AI 扰动",
  deterministic: "确定性",
};

export const MUTATION_PROFILE_KEY_LABELS: Record<string, string> = {
  satisfaction_factor: "情绪系数",
  stability_factor: "稳定系数",
  clue_factor: "线索系数",
};

export function formatTimeslot(timeslot: string): string {
  return TIMESLOT_LABELS[timeslot] ?? timeslot;
}

export function formatFlags(flags: Set<string> | string[]): string {
  const items = [...flags].sort();
  return items
    .map((f) => FLAG_LABELS[f] ?? `未登记标记（${f}）`)
    .join(", ");
}

export function formatHomeworkParts(partIds: readonly string[]): string {
  return partIds.map((p) => HOMEWORK_PART_LABELS[p] ?? p).join("、");
}

export function formatMutatorMode(mode: string): string {
  return MUTATOR_MODE_LABELS[mode] ?? mode;
}

export function formatEventLine(event: EventOutcome): string {
  const name = EVENT_NAMES_ZH[event.event_id] ?? `未登记事件（${event.event_id}）`;
  return `${name}：${event.description}`;
}

export function formatEndingSummary(endingId: string | null | undefined): string {
  if (!endingId) return ENDING_SUMMARY_LABELS["unknown"]!;
  return ENDING_SUMMARY_LABELS[endingId] ?? `未登记结局（${endingId}）`;
}

export function formatTrend(previous: number | null, current: number): string {
  if (previous === null || previous === undefined) return "初始";
  if (current > previous) return "上升";
  if (current < previous) return "下降";
  return "持平";
}

export function bandSatisfaction(value: number): string {
  if (value >= 80) return "高涨";
  if (value >= 60) return "稳定";
  if (value >= 40) return "波动";
  if (value >= 20) return "低迷";
  return "危险";
}

export function bandStability(value: number): string {
  if (value >= 75) return "平稳";
  if (value >= 55) return "轻晃";
  if (value >= 35) return "失衡";
  if (value >= 15) return "濒危";
  return "崩解边缘";
}

export function bandClueProgress(value: number): string {
  if (value >= 14) return "接近真相";
  if (value >= 10) return "推进明显";
  if (value >= 6) return "稳步推进";
  if (value >= 3) return "刚有眉目";
  return "线索稀薄";
}

export function bandCrewSync(value: number): string {
  if (value >= 70) return "高度协同";
  if (value >= 55) return "配合稳定";
  if (value >= 40) return "勉强对齐";
  if (value >= 25) return "摩擦增加";
  return "近乎失联";
}

export function bandNagatoFatigue(value: number): string {
  if (value >= 90) return "濒临崩溃";
  if (value >= 75) return "高负荷";
  if (value >= 55) return "明显疲劳";
  if (value >= 30) return "可见疲态";
  return "尚可支撑";
}
