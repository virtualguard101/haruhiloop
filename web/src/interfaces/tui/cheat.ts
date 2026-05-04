// 与 ending_conditions_zh.DISPLAY_FOR_CHEAT 对齐：用秘籍 'kyon' 触发的结局浏览页。

import { wrap } from "./render/ansi";
import { renderPanel } from "./render/panel";

const ENTRIES: ReadonlyArray<{ idx: string; title: string; lines: string[] }> = [
  {
    idx: "0",
    title: "长门有希的崩坏（暗线优先）",
    lines: [
      "· 长门路线推进过深且持续高负荷，最终先于世界崩裂。",
      "· 长门疲劳度 ≥ 96，且长门路线进度 ≥ 6",
    ],
  },
  {
    idx: "1",
    title: "晴空下的新周目",
    lines: [
      "· 春日路线与真相路线同步推进，团队在高协同下撬开循环。",
      "· 春日路线 ≥ 6、真相路线 ≥ 4、春日好感 ≥ 62",
      "· 满意度 ≥ 85、线索 ≥ 10、团员协同 ≥ 65",
      "· 标记要求：惊喜活动计划、暑假作业已完成、已向众人揭示循环、已安抚春日情绪",
    ],
  },
  {
    idx: "2",
    title: "共识温室",
    lines: [
      "· 古泉路线主导的共识机制压住波动，形成温和闭环。",
      "· 古泉路线 ≥ 4，真相路线 ≥ 3",
      "· 满意度 ≥ 68、稳定度 ≥ 52、线索 ≥ 9",
      "· 需同时具备叙事标记：希望信号、已向众人揭示循环、暑假作业已完成",
    ],
  },
  {
    idx: "3",
    title: "切口与回声",
    lines: [
      "· 真相线推进到深层，并与长门线形成互补突破。",
      "· 真相路线 ≥ 5、长门路线 ≥ 3",
      "· 线索 ≥ 12、稳定度 ≥ 45、团员协同 ≥ 55",
      "· 需同时具备叙事标记：已察觉异常、暑假作业已完成、已向众人揭示循环",
    ],
  },
  {
    idx: "4",
    title: "真相暴晒协议",
    lines: [
      "· 真相路线推进过快导致系统过载。",
      "· 真相路线 ≥ 4，路线张力 ≥ 6",
      "· 需已向众人揭示循环；稳定度 ≤ 20；满意度 ≥ 38；闭锁空间次数 ≥ 1",
    ],
  },
  {
    idx: "5",
    title: "空洞庆典",
    lines: [
      "· 春日线高度推进但回避核心真相，庆典后只剩空转。",
      "· 春日路线 ≥ 5",
      "· 需有叙事标记「惊喜活动计划」，且未「已向众人揭示循环」；满意度 ≥ 76；线索 ≤ 7",
    ],
  },
  {
    idx: "6",
    title: "归档囚徒",
    lines: [
      "· 长门线深挖资料到极限，却失去脱离循环的窗口。",
      "· 长门路线 ≥ 5",
      "· 线索 ≥ 16；稳定度在 (0, 38] 区间",
      "· 需同时具备叙事标记：已察觉异常、线索链已展开、已向众人揭示循环",
    ],
  },
  {
    idx: "7",
    title: "观测者脱钩",
    lines: [
      "· 你看清了异常却与主线人群脱节，只能以旁观者姿态抽离。",
      "· 真相路线 ≥ 2",
      "· 世界线偏移 ≥ 48；线索 ≥ 9；满意度 ≤ 52；需已「已察觉异常」",
    ],
  },
  {
    idx: "8",
    title: "结构体崩解",
    lines: [
      "· 情绪与稳定度双重失控，闭锁空间扩张到不可收拾。",
      "· 稳定度 ≤ 0；或 闭锁空间阶段 ≥ 3；或（满意度 ≤ 5 且 闭锁空间次数 ≥ 2）",
    ],
  },
];

export function renderCheatPanel(width: number): string[] {
  const lines: string[] = [
    wrap("当前版本结局条件", { bold: true }) +
      "（场景+选项驱动；判定自上而下，先命中先结算）",
    "",
  ];
  for (const e of ENTRIES) {
    lines.push(
      wrap(`${e.idx}.`, { bold: true, fg: "cyan" }) +
        " " +
        wrap(e.title, { bold: true }),
    );
    for (const l of e.lines) lines.push(`  ${l}`);
    lines.push("");
  }
  lines.push(wrap("叙事为原创向群像寓言，不必对应单一原作剧情。", { dim: true }));
  lines.push(wrap("按任意键关闭。", { dim: true }));
  return renderPanel(lines.join("\n"), width, {
    title: "Haruhi Loop · 结局条件速查",
    borderColor: "yellow",
    titleColor: "yellow",
  });
}
