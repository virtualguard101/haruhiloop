// 与 src/haruhiloop_cli/mutator.py 1:1 对齐（Deterministic 公式相同；
// AI 模式用 mulberry32 替代 Python random.Random，逻辑等价但二进制不一致）。

import { GameState, MutationProfile } from "./models";
import { mulberry32, randUniform } from "../infrastructure/prng";

export const PROFILE_KEYS = [
  "satisfaction_factor",
  "stability_factor",
  "clue_factor",
] as const;

export interface WorldlineMutator {
  mutate(state: GameState): MutationProfile;
}

export class DeterministicMutator implements WorldlineMutator {
  mutate(state: GameState): MutationProfile {
    const loopBias = Math.min(0.08, state.loop_count * 0.005);
    const stabilityBias = state.stability <= 40 ? 0.05 : 0.0;
    const clueBias = Math.min(0.1, (state.memory_residue["clue_efficiency"] ?? 0) * 0.02);
    return {
      satisfaction_factor: 1.0 - loopBias,
      stability_factor: 1.0 - stabilityBias,
      clue_factor: 1.0 + clueBias,
    };
  }
}

export class AIMutator implements WorldlineMutator {
  private readonly rng: () => number;
  private readonly temperature: number;

  constructor(seed: number | null = null, temperature = 0.7) {
    // 在没有 seed 时也保留可重现性：以当前时间戳作为 entropy。
    const seedNum = seed ?? ((Date.now() & 0xffffffff) >>> 0);
    this.rng = mulberry32(seedNum);
    this.temperature = Math.max(0.0, temperature);
  }

  mutate(state: GameState): MutationProfile {
    const spread = Math.max(0.02, Math.min(0.25, this.temperature * 0.2));
    const raw: MutationProfile = {
      satisfaction_factor: 1.0 + randUniform(this.rng, -spread, spread),
      stability_factor: 1.0 + randUniform(this.rng, -spread, spread),
      clue_factor: 1.0 + randUniform(this.rng, -spread, spread),
    };
    if (state.closed_space_stage > 0) raw.stability_factor -= 0.03;
    if (state.crew_sync >= 65) raw.satisfaction_factor += 0.02;
    return raw;
  }
}

export function validateProfile(profile: MutationProfile): MutationProfile {
  return {
    satisfaction_factor: Math.max(0.8, Math.min(1.2, profile.satisfaction_factor)),
    stability_factor: Math.max(0.8, Math.min(1.2, profile.stability_factor)),
    clue_factor: Math.max(0.8, Math.min(1.2, profile.clue_factor)),
  };
}

export function buildMutator(
  mode: string,
  seed: number | null = null,
  temperature = 0.7,
): WorldlineMutator {
  if (mode === "deterministic") return new DeterministicMutator();
  if (mode === "ai") return new AIMutator(seed, temperature);
  throw new Error(`未知扰动模式：${mode}`);
}
