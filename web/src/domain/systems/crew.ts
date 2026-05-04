// 与 src/haruhiloop_cli/systems/crew.py 1:1 对齐。

import { EventOutcome, GameState, makeEvent } from "../models";
import { clamp } from "../../infrastructure/clamp";

function boostMembers(state: GameState, amount: number): void {
  for (const key of Object.keys(state.member_trust)) {
    state.member_trust[key] = clamp((state.member_trust[key] ?? 0) + amount);
  }
}

export function applyCrewSync(state: GameState, choiceId: string): EventOutcome[] {
  const events: EventOutcome[] = [];
  if (choiceId === "group_call_sync" || choiceId === "truth_discussion") {
    if (state.crew_sync >= 60) {
      state.crew_sync = clamp(state.crew_sync + 4);
      boostMembers(state, 3);
      events.push(
        makeEvent({
          event_id: "crew_sync_breakthrough",
          description: "同步真相效果显著，团员间的默契明显上升。",
          delta_clue_points: 2,
          delta_stability: 2,
        }),
      );
    } else {
      state.crew_sync = clamp(state.crew_sync + 1);
      boostMembers(state, 1);
      events.push(
        makeEvent({
          event_id: "crew_sync_friction",
          description: "信息同步受阻，部分成员仍对循环半信半疑。",
          delta_satisfaction: -1,
          delta_stability: -2,
        }),
      );
    }
  } else if (
    choiceId === "nagato_archives" ||
    choiceId === "nagato_crosscheck" ||
    choiceId === "solo_trace"
  ) {
    state.crew_sync = clamp(state.crew_sync + 2);
    boostMembers(state, 1);
  } else if (choiceId === "group_briefing" || choiceId === "material_procurement") {
    state.crew_sync = clamp(state.crew_sync + 1);
  } else if (choiceId === "surprise_pitch") {
    state.crew_sync = clamp(state.crew_sync + 3);
    boostMembers(state, 2);
  }
  return events;
}
