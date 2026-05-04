// 等价于 tests/test_tui_hybrid_view.py：hybrid 模式 / step panel / band 函数 / selector。

import { describe, it, expect } from "vitest";
import { renderMetricTableHybrid } from "../src/interfaces/tui/render/status";
import { renderStepPanel } from "../src/interfaces/tui/render/step";
import { renderSceneSelector, renderChoiceSelector } from "../src/interfaces/tui/render/selectors";
import { renderTable } from "../src/interfaces/tui/render/table";
import { createGameState, makeSceneChoice } from "../src/domain/models";
import {
  bandStability,
  formatTrend,
} from "../src/narrative/i18n";

function plain(lines: string[]): string {
  return lines.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
}

describe("hybrid metric table", () => {
  it("隐藏内部行、显示档位与趋势", () => {
    const prev = createGameState("h1");
    prev.satisfaction = 30;
    const cur = createGameState("h1");
    cur.satisfaction = 70;
    cur.stability = 40;
    const out = plain(renderMetricTableHybrid(cur, prev, 100));
    expect(out).toContain("春日状态");
    expect(out).toContain("世界状态");
    expect(out).toContain("上升");
    expect(out).not.toContain("世界线偏移");
    expect(out).not.toContain("闭锁空间阶段");
    expect(out).not.toContain("扰动模式");
  });
});

describe("step panel narrative vs numeric", () => {
  const record = {
    step_number: 1,
    day: 1,
    timeslot: "morning" as const,
    scene_id: "clubroom",
    scene_label: "活动室",
    choice_id: "group_briefing",
    choice_label: "例行集合",
    before: { satisfaction: 50, stability: 70, clue_points: 5, nagato_fatigue: 10 },
    after: { satisfaction: 55, stability: 70, clue_points: 5, nagato_fatigue: 10 },
    events: [],
    mutation_profile: { satisfaction_factor: 1, stability_factor: 1, clue_factor: 1 },
    ending_id: null,
    action_flavor: null,
  };

  it("narrative 模式包含『阶段变化』，且不含数字 →", () => {
    const out = plain(renderStepPanel(record, true, 100));
    expect(out).toContain("阶段变化");
    expect(out).not.toContain("→");
    expect(out).not.toContain("扰动系数");
  });

  it("numeric 模式包含 → 与扰动系数", () => {
    const out = plain(renderStepPanel(record, false, 100));
    expect(out).toContain("→");
    expect(out).toContain("扰动系数");
  });
});

describe("i18n trend / band", () => {
  it("formatTrend(30, 40) === 上升, bandStability(80) === 平稳", () => {
    expect(formatTrend(30, 40)).toBe("上升");
    expect(bandStability(80)).toBe("平稳");
  });
});

describe("行动选项面板高亮选中项", () => {
  it("Panel 标题为 行动选项 + 高亮第 2 项 + 含提示文本", () => {
    const choices = [
      makeSceneChoice({
        scene_id: "x",
        choice_id: "a",
        label: "A 选项",
        description: "描述 A",
      }),
      makeSceneChoice({
        scene_id: "x",
        choice_id: "b",
        label: "B 选项",
        description: "描述 B",
      }),
    ];
    const lines = renderChoiceSelector(choices, "活动室", 2, 80);
    const text = lines.join("\n");
    expect(text).toContain("行动选项");
    // 反白序列 \x1b[1;7m 应出现在第 2 项行
    expect(text).toMatch(/\x1b\[1;7m.*B 选项/);
    expect(plain(lines)).toContain("数字键选中");
  });
});

describe("场景选择面板基本结构", () => {
  it("当无场景时显示『当前时段暂无可用场景。』", () => {
    const lines = renderSceneSelector([], 1, 80);
    expect(plain(lines)).toContain("当前时段暂无可用场景");
  });
});

describe("metric table 处理结局：仅显示标题，剧情由 step panel 承担", () => {
  it("hybrid metric 表里有结局标题、没有长剧情，每行宽度都不超过 totalWidth", () => {
    const state = createGameState("g1");
    state.ending_id = "hollow_celebration";
    state.ending_title = "空洞庆典";
    state.ending_epilogue =
      "气球、横幅与排练过十七次的口号把体育馆撑得满满当当。" +
      "镜头里每个人都笑得很标准，标准到像从同一个模板里抠出来的。";
    const totalWidth = 100;
    const out = renderMetricTableHybrid(state, null, totalWidth);
    for (const line of out) {
      const w = visibleWidthHelper(line);
      expect(w, `行可见宽度应 ≤ ${totalWidth}：${line}`).toBeLessThanOrEqual(totalWidth);
    }
    const text = plain(out);
    expect(text).toContain("结局");
    expect(text).toContain("空洞庆典");
    // 剧情长文本必须**不再**出现在 metric 里（避免与 step panel 重复打印长文本撑爆 viewport）
    expect(text).not.toContain("体育馆");
  });
});

describe("renderTable 在超长 cell 下不会撑爆", () => {
  it("含 250+ 字单元格的表，每行宽度都不超过 totalWidth，且长文本被换行不被截掉", () => {
    const longText =
      "气球、横幅与排练过十七次的口号把体育馆撑得满满当当。" +
      "镜头里每个人都笑得很标准，标准到像从同一个模板里抠出来的。" +
      "没有人提起循环，因为赞助商名单上没这一栏。满意度在高位漂浮，" +
      "像糖霜下面其实没有蛋糕。夜里你独自收拾彩带，发现垃圾桶里塞满了未拆封的「惊喜」——" +
      "原来热闹可以量产，而孤独不行。天亮以后，日历照旧，只是你突然听懂了那种安静：不是和平，是空心的回声。";
    const totalWidth = 100;
    const out = renderTable(
      {
        title: "回归：超长 cell",
        columns: [{ header: "字段" }, { header: "内容" }],
        rows: [
          ["短", "短文本"],
          ["长", longText],
        ],
        borderColor: "cyan",
      },
      totalWidth,
    );
    for (const line of out) {
      const w = visibleWidthHelper(line);
      expect(w, `行可见宽度应 ≤ ${totalWidth}：${line}`).toBeLessThanOrEqual(totalWidth);
    }
    const text = plain(out);
    // 头尾两个关键词都在，证明长文本被换行不被截掉
    expect(text).toContain("体育馆");
    expect(text).toContain("空心的回声");
  });
});

// 计算可见宽度（与 ansi.ts 同算法）
function visibleWidthHelper(s: string): number {
  let total = 0;
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\x1b") {
      const idx = s.indexOf("m", i);
      if (idx === -1) break;
      i = idx + 1;
      continue;
    }
    const cp = s.codePointAt(i)!;
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0x303e) ||
      (cp >= 0x3041 && cp <= 0x33ff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xff00 && cp <= 0xff60);
    total += wide ? 2 : 1;
    i += cp > 0xffff ? 2 : 1;
  }
  return total;
}
