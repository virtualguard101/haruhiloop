// 与 src/haruhiloop_cli/rules.py:8-224 的 SCENES 字典 1:1 对齐。

import { GameState, Scene, SceneChoice, makeSceneChoice, timeslotOf } from "../models";

export const SCENES: Record<string, Scene> = {
  clubroom: {
    scene_id: "clubroom",
    label: "活动室",
    description: "SOS 团活动室，意见与情绪最容易正面碰撞。",
    timeslots: ["morning", "afternoon"],
    choices: [
      makeSceneChoice({
        scene_id: "clubroom",
        choice_id: "group_briefing",
        label: "例行集合",
        description: "统一今天计划，保持队伍基本节奏。",
        delta_stability: 2,
        delta_satisfaction: 1,
        route_progress: { koizumi: 1 },
        affinity_delta: { koizumi: 1, haruhi: 1 },
        tags: ["routine"],
      }),
      makeSceneChoice({
        scene_id: "clubroom",
        choice_id: "surprise_pitch",
        label: "推进惊喜企划",
        description: "继续打磨夏日企划，刺激春日的兴奋感。",
        delta_satisfaction: 7,
        delta_stability: -1,
        add_flags: ["festival_plan"],
        route_progress: { haruhi: 2 },
        affinity_delta: { haruhi: 2 },
        tags: ["festival", "breakthrough"],
      }),
      makeSceneChoice({
        scene_id: "clubroom",
        choice_id: "haruhi_calm_talk",
        label: "私下安抚春日",
        description: "转移冲突焦点，压低闭锁空间风险。",
        delta_satisfaction: 5,
        delta_stability: 3,
        add_flags: ["haruhi_calmed"],
        route_progress: { haruhi: 1 },
        affinity_delta: { haruhi: 2, kyon: 1 },
        tags: ["coordination"],
      }),
    ],
  },
  library: {
    scene_id: "library",
    label: "图书馆",
    description: "静态调查场，长门路线与世界线证据主要来源。",
    timeslots: ["morning", "afternoon", "evening"],
    choices: [
      makeSceneChoice({
        scene_id: "library",
        choice_id: "nagato_crosscheck",
        label: "向长门核对异常",
        description: "校对异常样本，提升线索精度。",
        delta_clue_points: 3,
        delta_stability: -2,
        delta_nagato_fatigue: 10,
        add_flags: ["anomaly_seen"],
        route_progress: { nagato: 2, truth: 1 },
        affinity_delta: { nagato: 2 },
        tags: ["investigation", "nagato"],
      }),
      makeSceneChoice({
        scene_id: "library",
        choice_id: "nagato_archives",
        label: "借阅归档资料",
        description: "调取旧记录构建循环证据链。",
        delta_clue_points: 4,
        delta_satisfaction: -1,
        delta_nagato_fatigue: 15,
        add_flags: ["clue_chain_started"],
        route_progress: { nagato: 2, truth: 1 },
        affinity_delta: { nagato: 1 },
        tags: ["investigation", "nagato"],
      }),
      makeSceneChoice({
        scene_id: "library",
        choice_id: "solo_trace",
        label: "独自整理线索",
        description: "阿虚独立复盘，降低团队摩擦。",
        delta_clue_points: 2,
        delta_stability: 1,
        route_progress: { truth: 1 },
        affinity_delta: { kyon: 1 },
        tags: ["investigation"],
      }),
    ],
  },
  city: {
    scene_id: "city",
    label: "商店街",
    description: "高噪声公共场景，适合社交推进与突发事件。",
    timeslots: ["afternoon", "evening"],
    choices: [
      makeSceneChoice({
        scene_id: "city",
        choice_id: "material_procurement",
        label: "采购活动物料",
        description: "补齐企划执行资源，推进现场准备。",
        delta_satisfaction: 4,
        delta_stability: -1,
        delta_clue_points: 1,
        route_progress: { haruhi: 1 },
        affinity_delta: { haruhi: 1, mikuru: 1 },
        tags: ["festival", "breakthrough"],
      }),
      makeSceneChoice({
        scene_id: "city",
        choice_id: "mikuru_support",
        label: "陪朝比奈踩点",
        description: "缓解朝比奈临界压力，换取情报碎片。",
        delta_satisfaction: 2,
        delta_stability: 1,
        delta_clue_points: 1,
        route_progress: { mikuru: 2 },
        affinity_delta: { mikuru: 3 },
        tags: ["mikuru", "coordination"],
      }),
      makeSceneChoice({
        scene_id: "city",
        choice_id: "koizumi_debrief",
        label: "与古泉交换情报",
        description: "拉齐组织视角，建立协同边界。",
        delta_stability: 3,
        delta_clue_points: 2,
        route_progress: { koizumi: 2, truth: 1 },
        affinity_delta: { koizumi: 2 },
        tags: ["coordination", "truth_sync"],
      }),
    ],
  },
  home: {
    scene_id: "home",
    label: "阿虚家",
    description: "低刺激环境，适合补作业、整顿情绪。",
    timeslots: ["evening"],
    choices: [
      makeSceneChoice({
        scene_id: "home",
        choice_id: "homework_focus",
        label: "补习/作业推进",
        description: "集中处理暑假作业，减少长期压力源。",
        delta_satisfaction: 2,
        delta_stability: 4,
        route_progress: { haruhi: 1 },
        tags: ["homework", "breakthrough"],
      }),
      makeSceneChoice({
        scene_id: "home",
        choice_id: "private_reflection",
        label: "在家消磨并复盘",
        description: "降低社交摩擦，沉淀线索结构。",
        delta_stability: 2,
        delta_clue_points: 1,
        route_progress: { truth: 1 },
        affinity_delta: { kyon: 1 },
        tags: ["routine"],
      }),
      makeSceneChoice({
        scene_id: "home",
        choice_id: "group_call_sync",
        label: "夜间群聊同步循环",
        description: "通过远程交流统一风险判断。",
        delta_satisfaction: 3,
        delta_clue_points: 2,
        add_flags: ["truth_shared"],
        route_progress: { truth: 2, koizumi: 1 },
        affinity_delta: { koizumi: 1, haruhi: 1 },
        tags: ["truth_sync", "coordination"],
      }),
    ],
  },
  riverside: {
    scene_id: "riverside",
    label: "河堤公园",
    description: "夏日晚间情绪节点，容易触发关键分歧。",
    timeslots: ["evening"],
    choices: [
      makeSceneChoice({
        scene_id: "riverside",
        choice_id: "stargazing_talk",
        label: "与春日看夜空",
        description: "通过共享体验拉高情绪阈值。",
        delta_satisfaction: 6,
        delta_stability: 1,
        route_progress: { haruhi: 2 },
        affinity_delta: { haruhi: 3 },
        tags: ["haruhi_route"],
      }),
      makeSceneChoice({
        scene_id: "riverside",
        choice_id: "truth_discussion",
        label: "面对面揭示循环",
        description: "直接讨论循环真相，风险与收益都更高。",
        delta_satisfaction: 4,
        delta_stability: -2,
        delta_clue_points: 2,
        add_flags: ["truth_shared"],
        route_progress: { truth: 3 },
        affinity_delta: { haruhi: 1, nagato: 1, koizumi: 1 },
        tags: ["truth_sync", "high_risk"],
      }),
      makeSceneChoice({
        scene_id: "riverside",
        choice_id: "nagato_break",
        label: "让长门休整",
        description: "强制降载，换取短期稳定。",
        delta_stability: 3,
        delta_nagato_fatigue: -6,
        route_progress: { nagato: 1 },
        affinity_delta: { nagato: 2 },
        tags: ["nagato_relief"],
      }),
    ],
  },
};

export function getAvailableScenes(state: GameState): Scene[] {
  const ts = timeslotOf(state);
  return Object.values(SCENES).filter((scene) => scene.timeslots.includes(ts));
}

export function getScene(sceneId: string): Scene | undefined {
  return SCENES[sceneId];
}

export function getAvailableChoices(_state: GameState, sceneId: string): SceneChoice[] {
  const scene = SCENES[sceneId];
  return scene ? [...scene.choices] : [];
}

export function findChoice(sceneId: string, choiceId: string): SceneChoice | undefined {
  const scene = SCENES[sceneId];
  if (!scene) return undefined;
  return scene.choices.find((c) => c.choice_id === choiceId);
}

export function choiceHasTag(choice: SceneChoice, tag: string): boolean {
  return choice.tags.includes(tag);
}

export function resolveSceneRef(state: GameState, token: string): string {
  const t = token.trim();
  const scenes = getAvailableScenes(state);
  if (/^\d+$/.test(t)) {
    const i = parseInt(t, 10);
    if (i >= 1 && i <= scenes.length) {
      return scenes[i - 1]!.scene_id;
    }
    throw new Error(`场景序号须在 1–${scenes.length} 之间：${t}`);
  }
  for (const scene of scenes) {
    if (t === scene.scene_id || t === scene.label) {
      return scene.scene_id;
    }
  }
  throw new Error(`未知场景：${t}`);
}

export function resolveChoiceRef(
  state: GameState,
  sceneId: string,
  token: string,
): string {
  const t = token.trim();
  const choices = getAvailableChoices(state, sceneId);
  if (/^\d+$/.test(t)) {
    const i = parseInt(t, 10);
    if (i >= 1 && i <= choices.length) {
      return choices[i - 1]!.choice_id;
    }
    throw new Error(`选项序号须在 1–${choices.length} 之间：${t}`);
  }
  for (const choice of choices) {
    if (t === choice.choice_id || t === choice.label) {
      return choice.choice_id;
    }
  }
  throw new Error(`未知选项：${t}`);
}
