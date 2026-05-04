// 等价于 tests/test_action_flavor.py：确定性 + 不三连同 + StepRecord 含 flavor。

import { describe, it, expect } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { pickChoiceFlavor } from "../src/domain/action_flavor";
import { createGameState } from "../src/domain/models";

describe("action_flavor", () => {
  it("已登记的场景+选项返回非空文本", () => {
    const s = createGameState("f1", { random_seed: 7 });
    const out = pickChoiceFlavor(s, "clubroom", "group_briefing", 1);
    expect(out).toBeTruthy();
  });

  it("同 run_id + seed → flavor 确定性", () => {
    const a = createGameState("f2", { random_seed: 12 });
    const b = createGameState("f2", { random_seed: 12 });
    const fa = pickChoiceFlavor(a, "library", "nagato_crosscheck", 1);
    const fb = pickChoiceFlavor(b, "library", "nagato_crosscheck", 1);
    expect(fa).toBe(fb);
  });

  it("同一选项连续 120 步无三个相同 flavor", () => {
    const s = createGameState("f3", { random_seed: 5 });
    const seen: (string | null)[] = [];
    for (let i = 1; i <= 120; i++) {
      seen.push(pickChoiceFlavor(s, "clubroom", "group_briefing", i));
      s.scene_choice_counts["group_briefing"] =
        (s.scene_choice_counts["group_briefing"] ?? 0) + 1;
    }
    for (let i = 0; i + 2 < seen.length; i++) {
      const triple = seen.slice(i, i + 3);
      const all = triple.every((x) => x === triple[0]);
      expect(all).toBe(false);
    }
  });

  it("StepRecord.action_flavor 不为 null（已登记选项）", () => {
    const engine = new GameEngine();
    const state = createGameState("f4", { mutator_mode: "deterministic", random_seed: 9 });
    state.worldline_mutation_profile = { satisfaction_factor: 1, stability_factor: 1, clue_factor: 1 };
    const r = engine.step(state, { scene_id: "clubroom", choice_id: "group_briefing" }, 1);
    expect(r.record.action_flavor).not.toBeNull();
  });
});
