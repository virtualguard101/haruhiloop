// 等价于 tests/test_systems_v03.py。

import { describe, it, expect } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { createGameState } from "../src/domain/models";
import { applyMemoryResidue } from "../src/domain/systems/memory";

describe("crew_sync soft gate", () => {
  it("crew_sync < 55 + truth_sync 选项 → 协同不足事件", () => {
    const engine = new GameEngine();
    const state = createGameState("c1", { mutator_mode: "deterministic" });
    state.crew_sync = 40;
    state.timeslot_index = 1;
    state.worldline_mutation_profile = { satisfaction_factor: 1, stability_factor: 1, clue_factor: 1 };
    const r = engine.step(state, { scene_id: "city", choice_id: "koizumi_debrief" }, 1);
    const events = r.events.join(" ");
    expect(events).toContain("协同不足");
  });
});

describe("memory_residue 跨日累计", () => {
  it("当带 truth_shared / homework_done 标记时，residue 增加", () => {
    const state = createGameState("m1");
    state.flags.add("truth_shared");
    state.flags.add("homework_done");
    applyMemoryResidue(state);
    expect(state.memory_residue["clue_efficiency"]).toBeGreaterThan(0);
    expect(state.memory_residue["sync_recovery"]).toBeGreaterThan(0);
  });
});
