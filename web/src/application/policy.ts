// 与 src/haruhiloop_cli/policy.py 1:1 对齐：random / greedy 两策略。

import { GameState, Scene, SceneChoice, StepCommand, StepRecord } from "../domain/models";
import { mulberry32 } from "../infrastructure/prng";

export interface Policy {
  chooseCommand(
    state: GameState,
    scenes: Scene[],
    choiceMap: Record<string, SceneChoice[]>,
    history: StepRecord[],
  ): StepCommand;
}

export class RandomPolicy implements Policy {
  private readonly rng: () => number;
  constructor(seed: number | null = null) {
    const seedNum = seed ?? ((Date.now() & 0xffffffff) >>> 0);
    this.rng = mulberry32(seedNum);
  }
  chooseCommand(
    _state: GameState,
    scenes: Scene[],
    choiceMap: Record<string, SceneChoice[]>,
    _history: StepRecord[],
  ): StepCommand {
    const scene = scenes[Math.floor(this.rng() * scenes.length)] ?? scenes[0]!;
    const choices = choiceMap[scene.scene_id] ?? [];
    const choice = choices[Math.floor(this.rng() * choices.length)] ?? choices[0]!;
    return { scene_id: scene.scene_id, choice_id: choice.choice_id };
  }
}

export class GreedyPolicy implements Policy {
  chooseCommand(
    state: GameState,
    scenes: Scene[],
    choiceMap: Record<string, SceneChoice[]>,
    _history: StepRecord[],
  ): StepCommand {
    const score = (choice: SceneChoice): number => {
      let value =
        2 * choice.delta_satisfaction +
        2 * choice.delta_stability +
        3 * choice.delta_clue_points;
      if (
        state.stability < 40 &&
        (choice.tags.includes("coordination") || choice.tags.includes("nagato_relief"))
      ) {
        value += 8;
      }
      if (
        state.satisfaction < 45 &&
        (choice.tags.includes("festival") || choice.tags.includes("haruhi_route"))
      ) {
        value += 8;
      }
      if (state.clue_points > 8 && choice.tags.includes("truth_sync")) value += 6;
      return value;
    };
    const all: SceneChoice[] = [];
    for (const scene of scenes) {
      all.push(...(choiceMap[scene.scene_id] ?? []));
    }
    let best = all[0]!;
    let bestScore = score(best);
    for (const c of all) {
      const s = score(c);
      if (s > bestScore) {
        best = c;
        bestScore = s;
      }
    }
    return { scene_id: best.scene_id, choice_id: best.choice_id };
  }
}

export function createPolicy(name: string, seed: number | null = null): Policy {
  if (name === "random") return new RandomPolicy(seed);
  if (name === "greedy") return new GreedyPolicy();
  throw new Error(`未知策略：${name}`);
}
