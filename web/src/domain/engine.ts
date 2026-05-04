// 与 src/haruhiloop_cli/engine.py 1:1 对齐：步骤推进、时间推进、扰动 profile 计算。

import {
  Ending,
  GameState,
  MutationProfile,
  Scene,
  SceneChoice,
  StepCommand,
  StepRecord,
  TIMESLOTS,
  createGameState,
  isFinished,
  snapshot,
  timeslotOf,
} from "./models";
import {
  findChoice,
  getAvailableChoices,
  getAvailableScenes,
  getScene,
} from "./rules/scenes";
import { evaluateEvents } from "./rules/events";
import { evaluateEnding } from "./rules/endings";
import { applyHomeworkProgress, maybeTriggerHomeworkPressure } from "./systems/homework";
import { applyCrewSync } from "./systems/crew";
import { evaluateClosedSpaceStage } from "./systems/closed_space";
import {
  applyMemoryResidue,
  applyResidueDecay,
  injectResidueBonus,
} from "./systems/memory";
import { buildMutator, validateProfile } from "./mutator";
import { pickChoiceFlavor } from "./action_flavor";
import { formatEventLine, formatEndingSummary } from "../narrative/i18n";
import { clamp } from "../infrastructure/clamp";

export interface StepResult {
  state: GameState;
  record: StepRecord;
  scene: Scene;
  choice: SceneChoice;
  events: string[];
  ending: Ending | null;
}

export class GameEngine {
  createNewState(
    runId: string,
    options: {
      mutatorMode?: "ai" | "deterministic";
      randomSeed?: number | null;
      aiTemperature?: number;
    } = {},
  ): GameState {
    const state = createGameState(runId, {
      mutator_mode: options.mutatorMode ?? "ai",
      random_seed: options.randomSeed ?? null,
      ai_temperature: options.aiTemperature ?? 0.7,
    });
    state.worldline_mutation_profile = this._computeProfile(state);
    return state;
  }

  availableScenes(state: GameState): Scene[] {
    return getAvailableScenes(state);
  }

  availableChoices(state: GameState, sceneId: string): SceneChoice[] {
    return getAvailableChoices(state, sceneId);
  }

  step(state: GameState, command: StepCommand, stepNumber: number): StepResult {
    if (isFinished(state)) {
      const label = formatEndingSummary(state.ending_id);
      throw new Error(`本局已结束，结局：${label}`);
    }

    const scene = getScene(command.scene_id);
    if (!scene) throw new Error(`未知场景：${command.scene_id}`);
    if (!this.availableScenes(state).some((s) => s.scene_id === scene.scene_id)) {
      throw new Error(`当前时段不可进入场景：${command.scene_id}`);
    }
    const choice = findChoice(command.scene_id, command.choice_id);
    if (!choice) {
      throw new Error(`场景 ${command.scene_id} 下无选项：${command.choice_id}`);
    }

    const before = snapshot(state);
    const profile: MutationProfile =
      state.worldline_mutation_profile ?? this._computeProfile(state);
    const satFactor = profile.satisfaction_factor ?? 1.0;
    const stabFactor = profile.stability_factor ?? 1.0;
    const clueFactor = profile.clue_factor ?? 1.0;

    state.satisfaction = clamp(
      state.satisfaction + Math.round(choice.delta_satisfaction * satFactor),
    );
    state.stability = clamp(
      state.stability + Math.round(choice.delta_stability * stabFactor),
    );
    state.clue_points = clamp(
      state.clue_points + Math.round(choice.delta_clue_points * clueFactor),
    );
    state.nagato_fatigue = clamp(state.nagato_fatigue + choice.delta_nagato_fatigue);
    for (const f of choice.add_flags) state.flags.add(f);
    this._updateStreak(state, choice.choice_id);
    state.scene_choice_counts[choice.choice_id] =
      (state.scene_choice_counts[choice.choice_id] ?? 0) + 1;
    this._applyRouteUpdates(state, choice);

    const actionFlavor = pickChoiceFlavor(state, scene.scene_id, choice.choice_id, stepNumber);
    state.recent_choices.push(choice.choice_id);
    if (state.recent_choices.length > 8) {
      state.recent_choices = state.recent_choices.slice(-8);
    }
    state.worldline_shift +=
      Math.abs(choice.delta_satisfaction) + Math.abs(choice.delta_clue_points);

    const triggered = [
      ...applyHomeworkProgress(state, choice.choice_id),
      ...applyCrewSync(state, choice.choice_id),
      ...evaluateEvents(state, choice),
      ...evaluateClosedSpaceStage(state, choice.choice_id),
      ...maybeTriggerHomeworkPressure(state),
    ];

    injectResidueBonus(state);
    const eventLabels: string[] = [];
    for (const event of triggered) {
      state.satisfaction = clamp(state.satisfaction + event.delta_satisfaction);
      state.stability = clamp(state.stability + event.delta_stability);
      state.clue_points = clamp(state.clue_points + event.delta_clue_points);
      for (const f of event.add_flags) state.flags.add(f);
      eventLabels.push(formatEventLine(event));
    }

    const ending = evaluateEnding(state);
    if (ending !== null) {
      state.ending_id = ending.ending_id;
      state.ending_title = ending.title;
      state.ending_epilogue = ending.description;
    }

    this._advanceTime(state);

    const record: StepRecord = {
      step_number: stepNumber,
      day: Number(before["day"]),
      timeslot: before["timeslot"] as StepRecord["timeslot"],
      scene_id: scene.scene_id,
      scene_label: scene.label,
      choice_id: choice.choice_id,
      choice_label: choice.label,
      before,
      after: snapshot(state),
      events: eventLabels,
      mutation_profile: { ...profile },
      ending_id: state.ending_id,
      action_flavor: actionFlavor,
    };
    return {
      state,
      record,
      scene,
      choice,
      events: eventLabels,
      ending,
    };
  }

  private _computeProfile(state: GameState): MutationProfile {
    let seed = state.random_seed;
    if (state.mutator_mode === "ai" && seed !== null && seed !== undefined) {
      seed = seed + state.day * 97 + state.loop_count * 193;
    }
    const mutator = buildMutator(state.mutator_mode, seed, state.ai_temperature);
    try {
      return validateProfile(mutator.mutate(state));
    } catch {
      const fallback = buildMutator("deterministic");
      return validateProfile(fallback.mutate(state));
    }
  }

  private _updateStreak(state: GameState, choiceId: string): void {
    if (state.previous_choice === choiceId) {
      state.current_choice_streak += 1;
    } else {
      state.current_choice_streak = 0;
    }
    state.previous_choice = choiceId;
  }

  private _applyRouteUpdates(state: GameState, choice: SceneChoice): void {
    const rs = state.route_state;
    for (const [routeId, delta] of Object.entries(choice.route_progress)) {
      rs.route_progress[routeId] = (rs.route_progress[routeId] ?? 0) + delta;
    }
    for (const [charId, delta] of Object.entries(choice.affinity_delta)) {
      if (charId in rs.character_affinity) {
        rs.character_affinity[charId] = clamp((rs.character_affinity[charId] ?? 0) + delta);
      }
    }
    if (choice.tags.includes("high_risk")) {
      rs.route_tension = Math.max(0, Math.min(20, rs.route_tension + 2));
    } else if (choice.tags.includes("routine") || choice.tags.includes("nagato_relief")) {
      rs.route_tension = Math.max(0, Math.min(20, rs.route_tension - 1));
    }
  }

  private _advanceTime(state: GameState): void {
    if (state.timeslot_index === TIMESLOTS.length - 1) {
      applyMemoryResidue(state);
      state.timeslot_index = 0;
      state.day += 1;
      state.loop_count += 1;
      state.satisfaction = clamp(state.satisfaction - 1);
      state.stability = clamp(state.stability - 1);
      applyResidueDecay(state);
      state.worldline_mutation_profile = this._computeProfile(state);
    } else {
      state.timeslot_index += 1;
    }
    void timeslotOf; // 仅为引用，避免未使用警告
  }
}
