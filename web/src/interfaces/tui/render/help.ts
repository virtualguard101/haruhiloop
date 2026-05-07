// 与 play_app.py _help_panel + _HELP_BODY 对齐。
// Web 端的视觉强化：把按键名称放在 reverse 色块里（像键盘 chip 一样），
// 让玩家不用读全句也能扫到操作热键。

import { wrap } from "./ansi";
import { renderPanel } from "./panel";

function key(label: string): string {
  // 类键帽风格：黑底亮青字 + 左右一格
  return wrap(` ${label} `, { fg: "black", bg: "bright_cyan", bold: true });
}

const HELP_LINES = [
  `${key("1–9")} 　先选场景，再选该场景下的选项`,
  `${key("Enter")} 　确认执行当前场景 + 选项`,
  `${key("r")} 　重置当前预选（回到选场景）`,
  `${key("n")} 　新开一局（随机运行标识）`,
  `${key("v")} 　切换视图（混合叙事 / 详细数值）`,
  `${key("h")} 　打开 / 关闭帮助`,
  `${key("q")} 　退出程序`,
];

export function renderHelpPanel(viewMode: "hybrid" | "numeric", width: number): string[] {
  const label = viewMode === "hybrid" ? "混合叙事" : "详细数值";
  const lines = [
    ...HELP_LINES,
    "",
    `${wrap("当前视图", { bold: true, fg: "magenta" })}　${wrap(label, { fg: "bright_white", bold: true })}`,
    wrap("混合叙事：隐藏底层系统参数，只显示档位与趋势。", { dim: true }),
    wrap("详细数值：完整指标与精确变化、扰动系数。", { dim: true }),
  ];
  return renderPanel(lines.join("\n"), width, {
    title: "帮助",
    borderColor: "magenta",
    titleColor: "magenta",
  });
}

export function renderWelcomePanel(width: number): string[] {
  const body = [
    `${wrap("简介", { bold: true, fg: "cyan" })}　同一天不断轮回；先选场景，再选选项，最后按 ${key("Enter")} 确认。`,
    `${wrap("操作", { bold: true, fg: "cyan" })}　${key("1–9")} 选场景/选项　·　${key("r")} 重置　·　${key("Enter")} 确认　·　${key("n")} 新局　·　${key("v")} 视图　·　${key("h")} 帮助　·　${key("q")} 退出`,
    wrap("（首步操作完成后，本提示自动隐藏；按 h 可随时再次唤起。）", { dim: true }),
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
  const sceneStyled = selectedSceneLabel === "—"
    ? wrap(selectedSceneLabel, { dim: true })
    : wrap(selectedSceneLabel, { fg: "bright_cyan", bold: true });
  const choiceStyled = selectedChoiceLabel === "未选择"
    ? wrap(selectedChoiceLabel, { dim: true })
    : wrap(selectedChoiceLabel, { fg: "bright_magenta", bold: true });
  const body =
    `${wrap("当前场景", { dim: true })}　${sceneStyled}` +
    `　${wrap("│", { fg: "bright_black" })}　` +
    `${wrap("预选选项", { dim: true })}　${choiceStyled}`;
  return renderPanel(body, width, {
    title: "选择状态",
    borderColor: "cyan",
    titleColor: "cyan",
  });
}

export function renderEndedNotice(width: number): string[] {
  const body = `本局已结束。按 ${key("n")} 开始新局，或按 ${key("q")} 退出。`;
  return renderPanel(body, width, {
    title: "提示",
    borderColor: "yellow",
    titleColor: "yellow",
  });
}

export function renderClosedSpaceWarning(width: number): string[] {
  const body =
    wrap("⚠ 闭锁空间处于活跃阶段", { fg: "bright_red", bold: true }) +
    "：优先尝试 " +
    wrap("「安抚春日」", { fg: "bright_yellow", bold: true }) +
    " 或 " +
    wrap("「同步循环真相」", { fg: "bright_yellow", bold: true }) +
    " 以压制扩张。";
  return renderPanel(body, width, {
    title: "危机提示",
    borderColor: "red",
    titleColor: "bright_red",
  });
}
