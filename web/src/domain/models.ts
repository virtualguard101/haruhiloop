// 与 src/haruhiloop_cli/models.py 对齐的核心数据结构。
// 保持字段名、默认值、序列化形状 1:1。

export const TIMESLOTS = ["morning", "afternoon", "evening"] as const;
export type Timeslot = (typeof TIMESLOTS)[number];
export const CURRENT_SCHEMA_VERSION = 2;

export interface SceneChoice {
  scene_id: string;
  choice_id: string;
  label: string;
  description: string;
  delta_satisfaction: number;
  delta_stability: number;
  delta_clue_points: number;
  delta_nagato_fatigue: number;
  add_flags: readonly string[];
  route_progress: Readonly<Record<string, number>>;
  affinity_delta: Readonly<Record<string, number>>;
  tags: readonly string[];
}

export function makeSceneChoice(
  partial: Partial<SceneChoice> & Pick<SceneChoice, "scene_id" | "choice_id" | "label" | "description">,
): SceneChoice {
  return {
    delta_satisfaction: 0,
    delta_stability: 0,
    delta_clue_points: 0,
    delta_nagato_fatigue: 0,
    add_flags: [],
    route_progress: {},
    affinity_delta: {},
    tags: [],
    ...partial,
  };
}

export interface Scene {
  scene_id: string;
  label: string;
  description: string;
  timeslots: readonly Timeslot[];
  choices: readonly SceneChoice[];
}

export interface StepCommand {
  scene_id: string;
  choice_id: string;
}

export interface RouteState {
  active_route: string | null;
  route_progress: Record<string, number>;
  character_affinity: Record<string, number>;
  route_tension: number;
}

export function defaultRouteState(): RouteState {
  return {
    active_route: null,
    route_progress: {},
    character_affinity: {
      haruhi: 50,
      nagato: 50,
      mikuru: 50,
      koizumi: 50,
      kyon: 50,
    },
    route_tension: 0,
  };
}

export interface EventOutcome {
  event_id: string;
  description: string;
  delta_satisfaction: number;
  delta_stability: number;
  delta_clue_points: number;
  add_flags: readonly string[];
}

export function makeEvent(
  partial: Partial<EventOutcome> & Pick<EventOutcome, "event_id" | "description">,
): EventOutcome {
  return {
    delta_satisfaction: 0,
    delta_stability: 0,
    delta_clue_points: 0,
    add_flags: [],
    ...partial,
  };
}

export interface Ending {
  ending_id: string;
  title: string;
  description: string;
}

export interface MutationProfile {
  satisfaction_factor: number;
  stability_factor: number;
  clue_factor: number;
}

export interface GameState {
  run_id: string;
  schema_version: number;
  day: number;
  timeslot_index: number;
  loop_count: number;
  satisfaction: number;
  stability: number;
  clue_points: number;
  closed_space_count: number;
  worldline_shift: number;
  homework_progress: number;
  homework_parts_done: string[];
  crew_sync: number;
  member_trust: Record<string, number>;
  closed_space_stage: number;
  memory_residue: Record<string, number>;
  mutator_mode: "ai" | "deterministic";
  random_seed: number | null;
  ai_temperature: number;
  worldline_mutation_profile: MutationProfile;
  nagato_fatigue: number;
  route_state: RouteState;
  scene_choice_counts: Record<string, number>;
  scene_flavor_recent: Record<string, number[]>;
  ending_id: string | null;
  ending_title: string | null;
  ending_epilogue: string | null;
  flags: Set<string>;
  recent_choices: string[];
  current_choice_streak: number;
  previous_choice: string | null;
}

export function createGameState(
  run_id: string,
  overrides: Partial<GameState> = {},
): GameState {
  return {
    run_id,
    schema_version: CURRENT_SCHEMA_VERSION,
    day: 1,
    timeslot_index: 0,
    loop_count: 1,
    satisfaction: 60,
    stability: 70,
    clue_points: 0,
    closed_space_count: 0,
    worldline_shift: 0,
    homework_progress: 0,
    homework_parts_done: [],
    crew_sync: 45,
    member_trust: { kyon: 55, yuki: 50, mikuru: 45, koizumi: 48 },
    closed_space_stage: 0,
    memory_residue: { clue_efficiency: 0, sync_recovery: 0 },
    mutator_mode: "ai",
    random_seed: null,
    ai_temperature: 0.7,
    worldline_mutation_profile: {
      satisfaction_factor: 1.0,
      stability_factor: 1.0,
      clue_factor: 1.0,
    },
    nagato_fatigue: 0,
    route_state: defaultRouteState(),
    scene_choice_counts: {},
    scene_flavor_recent: {},
    ending_id: null,
    ending_title: null,
    ending_epilogue: null,
    flags: new Set<string>(),
    recent_choices: [],
    current_choice_streak: 0,
    previous_choice: null,
    ...overrides,
  };
}

export function timeslotOf(state: GameState): Timeslot {
  return TIMESLOTS[state.timeslot_index] ?? "morning";
}

export function isFinished(state: GameState): boolean {
  return state.ending_id !== null;
}

// 与 Python `GameState.snapshot()` 等价：把 set 排序、补 timeslot 字段。
export function snapshot(state: GameState): Record<string, unknown> {
  return {
    run_id: state.run_id,
    schema_version: state.schema_version,
    day: state.day,
    timeslot_index: state.timeslot_index,
    loop_count: state.loop_count,
    satisfaction: state.satisfaction,
    stability: state.stability,
    clue_points: state.clue_points,
    closed_space_count: state.closed_space_count,
    worldline_shift: state.worldline_shift,
    homework_progress: state.homework_progress,
    homework_parts_done: [...state.homework_parts_done].sort(),
    crew_sync: state.crew_sync,
    member_trust: { ...state.member_trust },
    closed_space_stage: state.closed_space_stage,
    memory_residue: { ...state.memory_residue },
    mutator_mode: state.mutator_mode,
    random_seed: state.random_seed,
    ai_temperature: state.ai_temperature,
    worldline_mutation_profile: { ...state.worldline_mutation_profile },
    nagato_fatigue: state.nagato_fatigue,
    route_state: {
      active_route: state.route_state.active_route,
      route_progress: { ...state.route_state.route_progress },
      character_affinity: { ...state.route_state.character_affinity },
      route_tension: state.route_state.route_tension,
    },
    scene_choice_counts: { ...state.scene_choice_counts },
    scene_flavor_recent: Object.fromEntries(
      Object.entries(state.scene_flavor_recent).map(([k, v]) => [k, [...v]]),
    ),
    ending_id: state.ending_id,
    ending_title: state.ending_title,
    ending_epilogue: state.ending_epilogue,
    flags: [...state.flags].sort(),
    recent_choices: [...state.recent_choices],
    current_choice_streak: state.current_choice_streak,
    previous_choice: state.previous_choice,
    timeslot: timeslotOf(state),
  };
}

// 与 Python `GameState.from_dict` 等价：版本检查、字段填充、容错。
export function fromSnapshot(data: Record<string, unknown>): GameState {
  const schema = Number(data["schema_version"] ?? 0);
  if (schema !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`存档版本不兼容：${schema}（当前支持 ${CURRENT_SCHEMA_VERSION}）。`);
  }
  const rs = (data["route_state"] ?? {}) as Record<string, unknown>;
  const memberTrust = (data["member_trust"] ?? {}) as Record<string, number>;
  const memoryResidue = (data["memory_residue"] ?? {}) as Record<string, number>;
  const profile = (data["worldline_mutation_profile"] ?? {}) as Record<string, number>;

  const state: GameState = {
    run_id: String(data["run_id"] ?? ""),
    schema_version: CURRENT_SCHEMA_VERSION,
    day: Number(data["day"] ?? 1),
    timeslot_index: Number(data["timeslot_index"] ?? 0),
    loop_count: Number(data["loop_count"] ?? 1),
    satisfaction: Number(data["satisfaction"] ?? 60),
    stability: Number(data["stability"] ?? 70),
    clue_points: Number(data["clue_points"] ?? 0),
    closed_space_count: Number(data["closed_space_count"] ?? 0),
    worldline_shift: Number(data["worldline_shift"] ?? 0),
    homework_progress: Number(data["homework_progress"] ?? 0),
    homework_parts_done: ((data["homework_parts_done"] ?? []) as string[]).slice(),
    crew_sync: Number(data["crew_sync"] ?? 45),
    member_trust: { kyon: 55, yuki: 50, mikuru: 45, koizumi: 48, ...memberTrust },
    closed_space_stage: Number(data["closed_space_stage"] ?? 0),
    memory_residue: { clue_efficiency: 0, sync_recovery: 0, ...memoryResidue },
    mutator_mode: ((data["mutator_mode"] as string) ?? "ai") as "ai" | "deterministic",
    random_seed:
      data["random_seed"] === null || data["random_seed"] === undefined
        ? null
        : Number(data["random_seed"]),
    ai_temperature: Number(data["ai_temperature"] ?? 0.7),
    worldline_mutation_profile: {
      satisfaction_factor: Number(profile["satisfaction_factor"] ?? 1.0),
      stability_factor: Number(profile["stability_factor"] ?? 1.0),
      clue_factor: Number(profile["clue_factor"] ?? 1.0),
    },
    nagato_fatigue: Number(data["nagato_fatigue"] ?? 0),
    route_state: {
      active_route: (rs["active_route"] as string | null) ?? null,
      route_progress: { ...((rs["route_progress"] ?? {}) as Record<string, number>) },
      character_affinity: {
        haruhi: 50,
        nagato: 50,
        mikuru: 50,
        koizumi: 50,
        kyon: 50,
        ...((rs["character_affinity"] ?? {}) as Record<string, number>),
      },
      route_tension: Number(rs["route_tension"] ?? 0),
    },
    scene_choice_counts: { ...((data["scene_choice_counts"] ?? {}) as Record<string, number>) },
    scene_flavor_recent: Object.fromEntries(
      Object.entries((data["scene_flavor_recent"] ?? {}) as Record<string, number[]>).map(
        ([k, v]) => [String(k), Array.isArray(v) ? v.map(Number) : []],
      ),
    ),
    ending_id: (data["ending_id"] as string | null) ?? null,
    ending_title: (data["ending_title"] as string | null) ?? null,
    ending_epilogue: (data["ending_epilogue"] as string | null) ?? null,
    flags: new Set<string>((data["flags"] ?? []) as string[]),
    recent_choices: ((data["recent_choices"] ?? []) as string[]).slice(),
    current_choice_streak: Number(data["current_choice_streak"] ?? 0),
    previous_choice: (data["previous_choice"] as string | null) ?? null,
  };
  return state;
}

export interface StepRecord {
  step_number: number;
  day: number;
  timeslot: Timeslot;
  scene_id: string;
  scene_label: string;
  choice_id: string;
  choice_label: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  events: string[];
  mutation_profile: MutationProfile | null;
  ending_id: string | null;
  action_flavor: string | null;
}
