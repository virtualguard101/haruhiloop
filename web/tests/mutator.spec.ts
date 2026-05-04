// 等价于 tests/test_mutator.py：profile clamp + deterministic 依赖 state。

import { describe, it, expect } from "vitest";
import { DeterministicMutator, validateProfile } from "../src/domain/mutator";
import { createGameState } from "../src/domain/models";

describe("validateProfile", () => {
  it("把 profile 各项 clamp 到 [0.8, 1.2]", () => {
    const out = validateProfile({
      satisfaction_factor: 5.0,
      stability_factor: -1.0,
      clue_factor: 1.0,
    });
    expect(out.satisfaction_factor).toBe(1.2);
    expect(out.stability_factor).toBe(0.8);
    expect(out.clue_factor).toBe(1.0);
  });
});

describe("DeterministicMutator 依赖 state", () => {
  it("不同 loop_count / stability 产生不同 profile", () => {
    const m = new DeterministicMutator();
    const a = createGameState("d1");
    const b = createGameState("d2");
    b.loop_count = 8;
    b.stability = 30;
    b.memory_residue["clue_efficiency"] = 4;
    const pa = m.mutate(a);
    const pb = m.mutate(b);
    expect(pa).not.toEqual(pb);
    expect(pb.satisfaction_factor).toBeLessThan(pa.satisfaction_factor);
    expect(pb.stability_factor).toBeLessThan(pa.stability_factor);
    expect(pb.clue_factor).toBeGreaterThan(pa.clue_factor);
  });
});
