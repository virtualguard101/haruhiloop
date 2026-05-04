// 等价于 tests/test_engine.py：5 个核心引擎用例。

import { describe, it, expect } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { GameState, snapshot } from "../src/domain/models";
import { resolveSceneRef, resolveChoiceRef } from "../src/domain/rules/scenes";

function runSequence(steps: Array<[string, string]>, options: { seed: number; mode?: "deterministic" | "ai" } = { seed: 42 }) {
  const engine = new GameEngine();
  const state: GameState = engine.createNewState("R001", {
    mutatorMode: options.mode ?? "deterministic",
    randomSeed: options.seed,
    aiTemperature: 0.5,
  });
  const records = [];
  let n = 1;
  for (const [s, c] of steps) {
    const r = engine.step(state, { scene_id: s, choice_id: c }, n);
    records.push(r.record);
    n += 1;
  }
  return { state, records };
}

describe("GameEngine 确定性", () => {
  it("同样命令序列 + 同 seed → 同最终状态", () => {
    const steps: Array<[string, string]> = [
      ["clubroom", "group_briefing"],
      ["library", "nagato_crosscheck"],
      ["home", "homework_focus"],
    ];
    const a = runSequence(steps);
    const b = runSequence(steps);
    expect(snapshot(a.state)).toEqual(snapshot(b.state));
    expect(a.records.map((r) => r.events)).toEqual(b.records.map((r) => r.events));
  });
});

describe("闭锁空间触发", () => {
  it("当 stability ≤ 35 时 closed_space_stage ≥ 1", () => {
    const engine = new GameEngine();
    const state = engine.createNewState("c001", {
      mutatorMode: "deterministic",
      randomSeed: 1,
    });
    state.stability = 34;
    engine.step(state, { scene_id: "library", choice_id: "solo_trace" }, 1);
    expect(state.closed_space_stage).toBeGreaterThanOrEqual(1);
  });
});

describe("scene/choice 引用解析", () => {
  it("数字与中文名都能解析", () => {
    const engine = new GameEngine();
    const state = engine.createNewState("ref001", { mutatorMode: "deterministic", randomSeed: 1 });
    expect(resolveSceneRef(state, "1")).toBeTruthy();
    expect(resolveSceneRef(state, "活动室")).toBe("clubroom");
    expect(resolveChoiceRef(state, "clubroom", "1")).toBeTruthy();
    expect(resolveChoiceRef(state, "clubroom", "例行集合")).toBe("group_briefing");
  });
});

describe("homework_focus 三次后 flag", () => {
  it("homework_progress 达到 3 且 flag 设置", () => {
    const engine = new GameEngine();
    const state = engine.createNewState("hw001", { mutatorMode: "deterministic", randomSeed: 1 });
    // home 场景仅 evening 可用，先把 timeslot 推到 evening
    state.timeslot_index = 2;
    engine.step(state, { scene_id: "home", choice_id: "homework_focus" }, 1);
    state.timeslot_index = 2;
    engine.step(state, { scene_id: "home", choice_id: "homework_focus" }, 2);
    state.timeslot_index = 2;
    engine.step(state, { scene_id: "home", choice_id: "homework_focus" }, 3);
    expect(state.homework_progress).toBe(3);
    expect(state.flags.has("homework_done")).toBe(true);
  });
});

describe("StepRecord 带 scene/choice label", () => {
  it("每步记录包含 scene_label 与 choice_label", () => {
    const engine = new GameEngine();
    const state = engine.createNewState("lbl001", { mutatorMode: "deterministic", randomSeed: 1 });
    const r = engine.step(state, { scene_id: "clubroom", choice_id: "group_briefing" }, 1);
    expect(r.record.scene_label).toBe("活动室");
    expect(r.record.choice_label).toBe("例行集合");
  });
});
