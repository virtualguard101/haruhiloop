// 与 src/haruhiloop_cli/systems/memory.py 1:1 对齐。

import { GameState } from "../models";
import { clamp } from "../../infrastructure/clamp";

export function applyMemoryResidue(state: GameState): void {
  let clueGain = 0;
  let syncGain = 0;
  if (state.flags.has("truth_shared")) {
    clueGain += 1;
    syncGain += 1;
  }
  if (state.flags.has("homework_done")) syncGain += 1;
  if (state.flags.has("hope_signal")) clueGain += 1;
  if (state.closed_space_stage > 0) syncGain += 1;

  const r = state.memory_residue;
  r["clue_efficiency"] = Math.min(5, (r["clue_efficiency"] ?? 0) + clueGain);
  r["sync_recovery"] = Math.min(5, (r["sync_recovery"] ?? 0) + syncGain);
}

export function applyResidueDecay(state: GameState): void {
  const r = state.memory_residue;
  r["clue_efficiency"] = Math.max(0, (r["clue_efficiency"] ?? 0) - 1);
  r["sync_recovery"] = Math.max(0, (r["sync_recovery"] ?? 0) - 1);
}

export function injectResidueBonus(state: GameState): void {
  const r = state.memory_residue;
  if ((r["clue_efficiency"] ?? 0) > 0) {
    state.clue_points = clamp(state.clue_points + 1);
  }
  if ((r["sync_recovery"] ?? 0) > 0) {
    state.crew_sync = clamp(state.crew_sync + 1);
  }
}
