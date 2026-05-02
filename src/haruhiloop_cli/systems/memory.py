from __future__ import annotations

from haruhiloop_cli.models import GameState, clamp


def apply_memory_residue(state: GameState) -> None:
    clue_gain = 0
    sync_gain = 0
    if "truth_shared" in state.flags:
        clue_gain += 1
        sync_gain += 1
    if "homework_done" in state.flags:
        sync_gain += 1
    if "hope_signal" in state.flags:
        clue_gain += 1
    if state.closed_space_stage > 0:
        sync_gain += 1

    residue = state.memory_residue
    residue["clue_efficiency"] = min(5, residue.get("clue_efficiency", 0) + clue_gain)
    residue["sync_recovery"] = min(5, residue.get("sync_recovery", 0) + sync_gain)


def apply_residue_decay(state: GameState) -> None:
    residue = state.memory_residue
    residue["clue_efficiency"] = max(0, residue.get("clue_efficiency", 0) - 1)
    residue["sync_recovery"] = max(0, residue.get("sync_recovery", 0) - 1)


def inject_residue_bonus(state: GameState) -> None:
    residue = state.memory_residue
    if residue.get("clue_efficiency", 0) > 0:
        state.clue_points = clamp(state.clue_points + 1)
    if residue.get("sync_recovery", 0) > 0:
        state.crew_sync = clamp(state.crew_sync + 1)

