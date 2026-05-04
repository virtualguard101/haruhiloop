// 等价于 tests/test_endings.py：8 个结局判定用例 + 优先级测试。

import { describe, it, expect } from "vitest";
import { evaluateEnding } from "../src/domain/rules/endings";
import { createGameState } from "../src/domain/models";

describe("结局判定", () => {
  it("haruhi_happy_new_world", () => {
    const s = createGameState("e1");
    s.route_state.route_progress = { haruhi: 6, truth: 4 };
    s.route_state.character_affinity.haruhi = 70;
    s.satisfaction = 90;
    s.clue_points = 12;
    s.crew_sync = 70;
    ["festival_plan", "homework_done", "truth_shared", "haruhi_calmed"].forEach((f) => s.flags.add(f));
    const e = evaluateEnding(s);
    expect(e?.ending_id).toBe("haruhi_happy_new_world");
  });

  it("kyon_breaks_loop", () => {
    const s = createGameState("e2");
    s.route_state.route_progress = { truth: 5, nagato: 3 };
    s.clue_points = 13;
    s.stability = 50;
    s.crew_sync = 60;
    ["anomaly_seen", "homework_done", "truth_shared"].forEach((f) => s.flags.add(f));
    expect(evaluateEnding(s)?.ending_id).toBe("kyon_breaks_loop");
  });

  it("shinjin_emerges (结构体崩解)", () => {
    const s = createGameState("e3");
    s.stability = 0;
    expect(evaluateEnding(s)?.ending_id).toBe("shinirappears_unstable_world");
  });

  it("consensus_paradise", () => {
    const s = createGameState("e4");
    s.route_state.route_progress = { koizumi: 4, truth: 3 };
    s.satisfaction = 70;
    s.stability = 55;
    s.clue_points = 10;
    ["hope_signal", "truth_shared", "homework_done"].forEach((f) => s.flags.add(f));
    expect(evaluateEnding(s)?.ending_id).toBe("consensus_paradise");
  });

  it("meltdown_pact", () => {
    const s = createGameState("e5");
    s.route_state.route_progress = { truth: 4 };
    s.flags.add("truth_shared");
    s.stability = 18;
    s.satisfaction = 40;
    s.closed_space_count = 1;
    s.route_state.route_tension = 6;
    expect(evaluateEnding(s)?.ending_id).toBe("meltdown_pact");
  });

  it("observer_bailout", () => {
    const s = createGameState("e6");
    s.route_state.route_progress = { truth: 2 };
    s.worldline_shift = 60;
    s.clue_points = 10;
    s.satisfaction = 50;
    s.flags.add("anomaly_seen");
    expect(evaluateEnding(s)?.ending_id).toBe("observer_bailout");
  });

  it("nagato_collapse 优先级 (即使其它结局也满足)", () => {
    const s = createGameState("e7");
    // 同时满足 haruhi_happy_new_world，但 nagato 路线 + fatigue 已达阈值
    s.route_state.route_progress = { haruhi: 6, truth: 4, nagato: 6 };
    s.route_state.character_affinity.haruhi = 70;
    s.satisfaction = 90;
    s.clue_points = 12;
    s.crew_sync = 70;
    s.nagato_fatigue = 96;
    ["festival_plan", "homework_done", "truth_shared", "haruhi_calmed"].forEach((f) =>
      s.flags.add(f),
    );
    expect(evaluateEnding(s)?.ending_id).toBe("nagato_collapse");
  });

  it("nagato_collapse 需要 route_progress >= 6 才触发", () => {
    const s = createGameState("e8");
    s.nagato_fatigue = 99;
    s.route_state.route_progress = { nagato: 5 };
    expect(evaluateEnding(s)?.ending_id).not.toBe("nagato_collapse");
  });
});
