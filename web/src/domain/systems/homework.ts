// 与 src/haruhiloop_cli/systems/homework.py 1:1 对齐。

import { EventOutcome, GameState, makeEvent, timeslotOf } from "../models";
import { clamp } from "../../infrastructure/clamp";

export const HOMEWORK_TARGET = 3;
const PART_ORDER = ["worksheet", "essay", "submission"] as const;
const PART_LABELS: Record<string, string> = {
  worksheet: "习题演算",
  essay: "读书笔记",
  submission: "集中提交",
};

export function applyHomeworkProgress(
  state: GameState,
  choiceId: string,
): EventOutcome[] {
  if (choiceId !== "homework_focus") {
    return [];
  }
  if (state.homework_progress >= HOMEWORK_TARGET) {
    return [
      makeEvent({
        event_id: "homework_already_done",
        description: "暑假作业已经提前完成，额外投入转化为整理复盘。",
        delta_clue_points: 1,
        delta_stability: 1,
      }),
    ];
  }

  const partId = PART_ORDER[state.homework_progress] ?? "worksheet";
  state.homework_progress += 1;
  state.homework_parts_done.push(partId);
  state.satisfaction = clamp(state.satisfaction + 1);
  state.stability = clamp(state.stability + 2);

  const events: EventOutcome[] = [
    makeEvent({
      event_id: "homework_progress",
      description: `完成作业环节：${PART_LABELS[partId]}。`,
      delta_stability: 1,
      delta_clue_points: 1,
    }),
  ];
  if (state.homework_progress >= HOMEWORK_TARGET) {
    state.flags.add("homework_done");
    events.push(
      makeEvent({
        event_id: "homework_completed",
        description: "暑期作业全数完成，循环中的重大心结被解除。",
        delta_satisfaction: 3,
        delta_stability: 4,
        add_flags: ["homework_done"],
      }),
    );
  }
  return events;
}

export function maybeTriggerHomeworkPressure(state: GameState): EventOutcome[] {
  if (timeslotOf(state) !== "evening") return [];
  if (state.homework_progress === 0) {
    return [
      makeEvent({
        event_id: "homework_pressure",
        description: "夜色临近却仍未动笔，作业压力在团内蔓延。",
        delta_satisfaction: -2,
        delta_stability: -1,
      }),
    ];
  }
  return [];
}
