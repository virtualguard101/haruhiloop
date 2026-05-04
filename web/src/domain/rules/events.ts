// 与 src/haruhiloop_cli/rules.py:293-353 evaluate_events 1:1 对齐。

import { EventOutcome, GameState, SceneChoice, makeEvent, timeslotOf } from "../models";
import { choiceHasTag } from "./scenes";

export function evaluateEvents(
  state: GameState,
  choice: SceneChoice,
): EventOutcome[] {
  const outcomes: EventOutcome[] = [];

  if (state.current_choice_streak >= 2) {
    outcomes.push(
      makeEvent({
        event_id: "boredom_spike",
        description: "重复同样的安排让春日更加厌倦。",
        delta_satisfaction: -2 * state.current_choice_streak,
        delta_stability: -state.current_choice_streak,
      }),
    );
  }

  if (timeslotOf(state) === "evening") {
    outcomes.push(
      makeEvent({
        event_id: "day_end_drift",
        description: "这一天又在未解的心结里结束。",
        delta_satisfaction: -2,
        delta_stability: -1,
      }),
    );
  }

  if (state.satisfaction <= 30 && !state.flags.has("anomaly_seen")) {
    outcomes.push(
      makeEvent({
        event_id: "restless_search",
        description: "情绪低落迫使她转向可疑的岔路。",
        delta_stability: -3,
        add_flags: ["anomaly_seen"],
      }),
    );
  }

  if (choiceHasTag(choice, "truth_sync") && state.crew_sync < 55) {
    outcomes.push(
      makeEvent({
        event_id: "sync_without_alignment",
        description: "团员协同不足，同步真相并未形成稳定合力。",
        delta_stability: -2,
        delta_satisfaction: -1,
      }),
    );
  }

  if (
    choiceHasTag(choice, "festival") &&
    state.flags.has("homework_done") &&
    state.flags.has("truth_shared") &&
    state.crew_sync >= 60
  ) {
    outcomes.push(
      makeEvent({
        event_id: "hope_signal",
        description: "计划逐渐成形，大家的世界线开始偏移向更好的方向。",
        delta_satisfaction: 6,
        delta_stability: 5,
        delta_clue_points: 2,
        add_flags: ["hope_signal"],
      }),
    );
  }

  return outcomes;
}
