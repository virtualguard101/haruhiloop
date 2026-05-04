// 跨语言 golden 测试：deterministic mutator 模式下 TS 引擎应与 Python
// 权威实现产生同样的状态字段（除允许差异的 action_flavor / scene_flavor_recent）。

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { GameEngine } from "../../src/domain/engine";
import { GameState, snapshot } from "../../src/domain/models";

interface GoldenStep {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  events: string[];
  mutation_profile: Record<string, number>;
  ending_id: string | null;
}

interface GoldenPayload {
  config: { run_id: string; seed: number; mutator_mode: "deterministic"; ai_temperature: number };
  actions: Array<[string, string]>;
  steps: GoldenStep[];
  final_state: Record<string, unknown>;
}

const DATA_DIR = join(__dirname, "data");

function listGoldenFiles(): string[] {
  return readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).map((f) => join(DATA_DIR, f));
}

// 字段允许差异：PRNG 实现不同，flavor 文本与历史索引可能不同。
const SKIP_FIELDS = new Set([
  "scene_flavor_recent",
]);

function compareSnapshots(actual: Record<string, unknown>, expected: Record<string, unknown>, label: string): void {
  for (const key of Object.keys(expected)) {
    if (SKIP_FIELDS.has(key)) continue;
    const a = actual[key];
    const b = expected[key];
    expect(a, `${label} 字段 ${key}`).toEqual(b);
  }
}

describe("Golden test (Python ↔ TypeScript 一致性)", () => {
  const files = listGoldenFiles();
  if (files.length === 0) {
    it.skip("no golden data — 先运行 scripts/dump_golden.py 生成", () => {});
    return;
  }
  for (const file of files) {
    const payload: GoldenPayload = JSON.parse(readFileSync(file, "utf-8"));
    const name = payload.config.run_id;
    it(`重放 ${name} 与 Python 序列字段一致`, () => {
      const engine = new GameEngine();
      const state: GameState = engine.createNewState(name, {
        mutatorMode: "deterministic",
        randomSeed: payload.config.seed,
        aiTemperature: payload.config.ai_temperature,
      });
      let n = 1;
      for (const [stepIdx, [scene, choice]] of payload.actions.entries()) {
        const result = engine.step(state, { scene_id: scene, choice_id: choice }, n);
        const expected = payload.steps[stepIdx]!;
        compareSnapshots(result.record.before, expected.before, `step ${n} before`);
        compareSnapshots(result.record.after, expected.after, `step ${n} after`);
        expect(result.record.events, `step ${n} events`).toEqual(expected.events);
        expect(result.record.mutation_profile, `step ${n} profile`).toEqual(expected.mutation_profile);
        expect(result.record.ending_id ?? null, `step ${n} ending_id`).toEqual(expected.ending_id ?? null);
        n += 1;
      }
      compareSnapshots(snapshot(state), payload.final_state, "final state");
    });
  }
});
