// 与 src/haruhiloop_cli/rules.py:356-481 evaluate_ending 1:1 对齐。

import { Ending, GameState } from "../models";
import { epilogueFor } from "./ending_epilogues";

export const NAGATO_COLLAPSE_FATIGUE_THRESHOLD = 96;

function routeAtLeast(state: GameState, routeId: string, minimum: number): boolean {
  return (state.route_state.route_progress[routeId] ?? 0) >= minimum;
}

function affinityAtLeast(state: GameState, charId: string, minimum: number): boolean {
  return (state.route_state.character_affinity[charId] ?? 0) >= minimum;
}

function hasAll(state: GameState, flags: readonly string[]): boolean {
  return flags.every((f) => state.flags.has(f));
}

export function evaluateEnding(state: GameState): Ending | null {
  if (
    state.nagato_fatigue >= NAGATO_COLLAPSE_FATIGUE_THRESHOLD &&
    routeAtLeast(state, "nagato", 6)
  ) {
    return {
      ending_id: "nagato_collapse",
      title: "长门有希的崩坏",
      description: epilogueFor("nagato_collapse"),
    };
  }

  if (
    routeAtLeast(state, "haruhi", 6) &&
    routeAtLeast(state, "truth", 4) &&
    affinityAtLeast(state, "haruhi", 62) &&
    state.satisfaction >= 85 &&
    state.clue_points >= 10 &&
    hasAll(state, ["festival_plan", "homework_done", "truth_shared", "haruhi_calmed"]) &&
    state.crew_sync >= 65
  ) {
    return {
      ending_id: "haruhi_happy_new_world",
      title: "晴空下的新周目",
      description: epilogueFor("haruhi_happy_new_world"),
    };
  }

  if (
    routeAtLeast(state, "koizumi", 4) &&
    routeAtLeast(state, "truth", 3) &&
    state.satisfaction >= 68 &&
    state.stability >= 52 &&
    state.clue_points >= 9 &&
    hasAll(state, ["hope_signal", "truth_shared", "homework_done"])
  ) {
    return {
      ending_id: "consensus_paradise",
      title: "共识温室",
      description: epilogueFor("consensus_paradise"),
    };
  }

  if (
    routeAtLeast(state, "truth", 5) &&
    routeAtLeast(state, "nagato", 3) &&
    state.clue_points >= 12 &&
    hasAll(state, ["anomaly_seen", "homework_done", "truth_shared"]) &&
    state.stability >= 45 &&
    state.crew_sync >= 55
  ) {
    return {
      ending_id: "kyon_breaks_loop",
      title: "切口与回声",
      description: epilogueFor("kyon_breaks_loop"),
    };
  }

  if (
    routeAtLeast(state, "truth", 4) &&
    state.flags.has("truth_shared") &&
    state.stability <= 20 &&
    state.satisfaction >= 38 &&
    state.closed_space_count >= 1 &&
    state.route_state.route_tension >= 6
  ) {
    return {
      ending_id: "meltdown_pact",
      title: "真相暴晒协议",
      description: epilogueFor("meltdown_pact"),
    };
  }

  if (
    routeAtLeast(state, "haruhi", 5) &&
    state.flags.has("festival_plan") &&
    !state.flags.has("truth_shared") &&
    state.satisfaction >= 76 &&
    state.clue_points <= 7
  ) {
    return {
      ending_id: "hollow_celebration",
      title: "空洞庆典",
      description: epilogueFor("hollow_celebration"),
    };
  }

  if (
    routeAtLeast(state, "nagato", 5) &&
    state.clue_points >= 16 &&
    state.stability > 0 &&
    state.stability <= 38 &&
    hasAll(state, ["anomaly_seen", "clue_chain_started", "truth_shared"])
  ) {
    return {
      ending_id: "archive_bound",
      title: "归档囚徒",
      description: epilogueFor("archive_bound"),
    };
  }

  if (
    routeAtLeast(state, "truth", 2) &&
    state.worldline_shift >= 48 &&
    state.clue_points >= 9 &&
    state.satisfaction <= 52 &&
    state.flags.has("anomaly_seen")
  ) {
    return {
      ending_id: "observer_bailout",
      title: "观测者脱钩",
      description: epilogueFor("observer_bailout"),
    };
  }

  if (
    state.stability <= 0 ||
    state.closed_space_stage >= 3 ||
    (state.satisfaction <= 5 && state.closed_space_count >= 2)
  ) {
    return {
      ending_id: "shinirappears_unstable_world",
      title: "结构体崩解",
      description: epilogueFor("shinirappears_unstable_world"),
    };
  }

  return null;
}
