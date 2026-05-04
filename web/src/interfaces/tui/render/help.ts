// 与 play_app.py _help_panel + _HELP_BODY 对齐。

import { wrap } from "./ansi";
import { renderPanel } from "./panel";

const HELP_LINES = [
  `${wrap("数字键 1–9", { bold: true })}  先选场景，再选该场景下的选项`,
  `${wrap("Enter", { bold: true })}  确认执行当前场景+选项`,
  `${wrap("r", { bold: true })}  重置当前预选（回到选场景）`,
  `${wrap("n", { bold: true })}  新开一局（随机运行标识）`,
  `${wrap("v", { bold: true })}  切换视图（混合叙事 / 详细数值）`,
  `${wrap("q", { bold: true })}  退出程序`,
  `${wrap("h", { bold: true })}  打开/关闭帮助（再按一次关闭）`,
];

export function renderHelpPanel(viewMode: "hybrid" | "numeric", width: number): string[] {
  const label = viewMode === "hybrid" ? "混合叙事" : "详细数值";
  const lines = [
    ...HELP_LINES,
    "",
    `${wrap("当前视图", { bold: true })}  ${label}`,
    wrap("混合叙事：隐藏底层系统参数，只显示档位与趋势；详细数值：完整指标与精确变化。", { dim: true }),
  ];
  return renderPanel(lines.join("\n"), width, {
    title: "帮助",
    borderColor: "magenta",
    titleColor: "magenta",
  });
}

export function renderWelcomePanel(width: number): string[] {
  const body = [
    `${wrap("简介", { bold: true })}  同一天不断轮回；先选场景，再选选项，最后按 Enter 确认。`,
    `${wrap("操作", { bold: true })}  ${wrap("1–9", { fg: "cyan" })} 选场景/选项  ·  ${wrap("r", { fg: "cyan" })} 重置预选  ·  ${wrap("Enter", { fg: "cyan" })} 确认  ·  ${wrap("n", { fg: "cyan" })} 新局  ·  ${wrap("v", { fg: "cyan" })} 视图切换  ·  ${wrap("q", { fg: "cyan" })} 退出  ·  ${wrap("h", { fg: "cyan" })} 帮助`,
    wrap("方向键等扩展可在后续版本加入。", { dim: true }),
  ].join("\n");
  return renderPanel(body, width, {
    title: "开局说明",
    borderColor: "cyan",
    titleColor: "cyan",
  });
}

export function renderBreadcrumbPanel(
  selectedSceneLabel: string,
  selectedChoiceLabel: string,
  width: number,
): string[] {
  const body = `当前场景：${selectedSceneLabel} | 预选选项：${selectedChoiceLabel}`;
  return renderPanel(body, width, {
    title: "选择状态",
    borderColor: "cyan",
    titleColor: "cyan",
  });
}

export function renderEndedNotice(width: number): string[] {
  const body = `本局已结束。按 ${wrap("n", { bold: true, fg: "cyan" })} 开始新局，或 ${wrap("q", { bold: true, fg: "cyan" })} 退出。`;
  return renderPanel(body, width, {
    title: "提示",
    borderColor: "yellow",
    titleColor: "yellow",
  });
}

export function renderClosedSpaceWarning(width: number): string[] {
  return renderPanel(
    "闭锁空间处于活跃阶段：优先尝试「安抚春日」或「同步循环真相」以压制扩张。",
    width,
    { title: "危机提示", borderColor: "red", titleColor: "red" },
  );
}
