// 与 src/haruhiloop_cli/systems/closed_space.py 1:1 对齐。

import { EventOutcome, GameState, makeEvent } from "../models";
import { clamp } from "../../infrastructure/clamp";

export function evaluateClosedSpaceStage(
  state: GameState,
  choiceId: string,
): EventOutcome[] {
  const outcomes: EventOutcome[] = [];
  if (state.stability <= 35) {
    state.closed_space_stage = Math.min(3, state.closed_space_stage + 1);
  } else if (state.closed_space_stage > 0) {
    state.closed_space_stage -= 1;
  }

  if (state.closed_space_stage === 0) return outcomes;

  outcomes.push(
    makeEvent({
      event_id: "closed_space_stage",
      description: `闭锁空间危机等级提升至 ${state.closed_space_stage} 阶。`,
      delta_stability: -2 * state.closed_space_stage,
      add_flags: ["closed_space_active"],
    }),
  );
  if (
    choiceId === "haruhi_calm_talk" ||
    choiceId === "group_call_sync" ||
    choiceId === "truth_discussion"
  ) {
    const recovery = 2 + state.closed_space_stage;
    outcomes.push(
      makeEvent({
        event_id: "closed_space_countermeasure",
        description: "你与团员协同应对，暂时压制住闭锁空间扩张。",
        delta_stability: recovery,
        delta_satisfaction: 1,
        add_flags: ["closed_space_resolved"],
      }),
    );
    state.closed_space_stage = Math.max(0, state.closed_space_stage - 1);
  } else {
    state.closed_space_count += 1;
    state.worldline_shift += state.closed_space_stage;
    state.satisfaction = clamp(state.satisfaction - state.closed_space_stage);
  }

  return outcomes;
}
