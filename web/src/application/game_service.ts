// 与 src/haruhiloop_cli/application/services/game_service.py 1:1 对齐。

import { GameEngine, StepResult } from "../domain/engine";
import {
  GameState,
  Scene,
  SceneChoice,
  StepCommand,
  StepRecord,
  isFinished,
} from "../domain/models";
import { resolveChoiceRef, resolveSceneRef } from "../domain/rules/scenes";
import * as storage from "../infrastructure/storage_idb";
import { createPolicy } from "./policy";

export interface RunViewState {
  state: GameState;
  scenes: Scene[];
  selected_scene: Scene | null;
  choices: SceneChoice[];
}

export interface StepViewState {
  result: StepResult;
  scenes: Scene[];
  selected_scene: Scene | null;
  choices: SceneChoice[];
}

export interface SimulationSummary {
  runs: number;
  unresolved: number;
  endings: Record<string, number>;
}

export class GameService {
  constructor(public readonly engine: GameEngine = new GameEngine()) {}

  async startRun(
    runId: string,
    options: {
      mutatorMode: "ai" | "deterministic";
      seed: number | null;
      aiTemperature: number;
    },
  ): Promise<RunViewState> {
    const state = this.engine.createNewState(runId, {
      mutatorMode: options.mutatorMode,
      randomSeed: options.seed,
      aiTemperature: options.aiTemperature,
    });
    await storage.saveState(state);
    return this._buildRunView(state);
  }

  async stepRun(runId: string, sceneRef: string, choiceRef: string): Promise<StepViewState> {
    const state = await storage.loadState(runId);
    const history = await storage.loadHistory(runId);
    const sceneId = resolveSceneRef(state, sceneRef);
    const choiceId = resolveChoiceRef(state, sceneId, choiceRef);
    const command: StepCommand = { scene_id: sceneId, choice_id: choiceId };
    const result = this.engine.step(state, command, history.length + 1);
    await storage.appendHistory(runId, result.record);
    await storage.saveState(result.state);

    const current = this._buildRunView(result.state);
    const selected =
      current.scenes.find((s) => s.scene_id === result.record.scene_id) ??
      current.selected_scene;
    const choices = selected
      ? this.engine.availableChoices(result.state, selected.scene_id)
      : [];
    return {
      result,
      scenes: current.scenes,
      selected_scene: selected,
      choices,
    };
  }

  async status(runId: string): Promise<RunViewState> {
    const state = await storage.loadState(runId);
    return this._buildRunView(state);
  }

  async history(runId: string): Promise<StepRecord[]> {
    await storage.loadState(runId);
    return storage.loadHistory(runId);
  }

  async replay(runId: string): Promise<{ state: GameState; records: StepRecord[] }> {
    const state = await storage.loadState(runId);
    const records = await storage.loadHistory(runId);
    return { state, records };
  }

  /**
   * 内存模拟，不写存档。
   */
  simulate(options: {
    runs: number;
    maxSteps: number;
    policyName: "random" | "greedy";
    mutatorMode: "ai" | "deterministic";
    seed: number | null;
    aiTemperature: number;
  }): SimulationSummary {
    const policy = createPolicy(options.policyName, options.seed);
    const endings: Record<string, number> = {};
    let unresolved = 0;
    for (let index = 0; index < options.runs; index++) {
      const runSeed = options.seed === null ? null : options.seed + index;
      let state = this.engine.createNewState(`sim-${index}`, {
        mutatorMode: options.mutatorMode,
        randomSeed: runSeed,
        aiTemperature: options.aiTemperature,
      });
      const records: StepRecord[] = [];
      for (let stepNumber = 1; stepNumber <= options.maxSteps; stepNumber++) {
        const scenes = this.engine.availableScenes(state);
        if (scenes.length === 0) break;
        const choiceMap: Record<string, SceneChoice[]> = {};
        for (const scene of scenes) {
          choiceMap[scene.scene_id] = this.engine.availableChoices(state, scene.scene_id);
        }
        const command = policy.chooseCommand(state, scenes, choiceMap, records);
        const result = this.engine.step(state, command, stepNumber);
        records.push(result.record);
        state = result.state;
        if (isFinished(state)) {
          const id = state.ending_id ?? "unknown";
          endings[id] = (endings[id] ?? 0) + 1;
          break;
        }
      }
      if (!isFinished(state)) unresolved += 1;
    }
    return { runs: options.runs, unresolved, endings };
  }

  private _buildRunView(state: GameState): RunViewState {
    const scenes = this.engine.availableScenes(state);
    const selected = scenes[0] ?? null;
    const choices = selected ? this.engine.availableChoices(state, selected.scene_id) : [];
    return { state, scenes, selected_scene: selected, choices };
  }
}
