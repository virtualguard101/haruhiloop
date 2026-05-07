// 与 view.py make_scene_selector_panel + make_choice_selector_panel 1:1 对齐。
// 双行版（label + 描述）保留原 Python TUI 的视觉；
// 紧凑版把 label 与描述合并到同一行，去掉行间空行，省 2/3 行高，
// 用于浏览器视窗装不下时降级。
//
// 视觉细节：
//   - 序号用 [n]，未选项用 dim cyan 灰括号；选中项用反白 + bold 整段
//   - 选中项前置 ▶ 三角，未选项前置 · 圆点，对齐
//   - 描述行用 dim 显示，与 label 形成层级感

import { Scene, SceneChoice } from "../../../domain/models";
import { renderPanel } from "./panel";
import { wrap } from "./ansi";

interface Item {
  label: string;
  description: string;
}

function renderItemLines(items: readonly Item[], highlight: number | null, compact: boolean): string[] {
  const lines: string[] = [];
  items.forEach((it, i) => {
    const idx = i + 1;
    const selected = highlight === idx;
    const numTag = `[${idx}]`;
    if (compact) {
      const text = `${numTag} ${it.label} — ${it.description}`;
      if (selected) {
        lines.push(wrap(`▶ ${text}`, { bold: true, reverse: true }));
      } else {
        const num = wrap(numTag, { fg: "cyan", bold: true });
        const labelStyled = wrap(it.label, { fg: "bright_white" });
        const desc = wrap(`— ${it.description}`, { dim: true });
        lines.push(`  ${num} ${labelStyled} ${desc}`);
      }
    } else {
      if (selected) {
        lines.push(wrap(`▶ ${numTag} ${it.label}`, { bold: true, reverse: true }));
        lines.push(wrap(`   ${it.description}`, { bold: true, reverse: true }));
      } else {
        const num = wrap(numTag, { fg: "cyan", bold: true });
        const labelStyled = wrap(it.label, { fg: "bright_white", bold: true });
        const desc = wrap(it.description, { dim: true });
        lines.push(`${wrap("·", { fg: "bright_black" })} ${num} ${labelStyled}`);
        lines.push(`     ${desc}`);
      }
      lines.push("");
    }
  });
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export function renderSceneSelector(
  scenes: readonly Scene[],
  highlightIndex: number | null,
  width: number,
  compact = false,
): string[] {
  const lines: string[] = [];
  if (scenes.length === 0) {
    lines.push(wrap("当前时段暂无可用场景。", { dim: true }));
  } else {
    lines.push(...renderItemLines(scenes, highlightIndex, compact));
  }
  return renderPanel(lines.join("\n") || " ", width, {
    title: "场景选择（按数字键）",
    borderColor: "cyan",
    titleColor: "cyan",
  });
}

export function renderChoiceSelector(
  choices: readonly SceneChoice[],
  sceneLabel: string,
  highlightIndex: number | null,
  width: number,
  compact = false,
): string[] {
  const lines: string[] = [];
  if (compact) {
    lines.push(
      `${wrap("当前场景", { dim: true })}　${wrap(sceneLabel, { fg: "cyan", bold: true })}　${wrap("·", { dim: true })}　${wrap("数字键选中，Enter 确认，r 重置", { dim: true })}`,
    );
  } else {
    lines.push(`${wrap("当前场景", { dim: true })}　${wrap(sceneLabel, { fg: "cyan", bold: true })}`);
    lines.push("");
  }
  if (choices.length === 0) {
    lines.push(wrap("请先选择场景。", { dim: true }));
  } else {
    lines.push(...renderItemLines(choices, highlightIndex, compact));
  }
  if (!compact) {
    lines.push("");
    lines.push(wrap("数字键选中　·　Enter 确认　·　r 重置", { dim: true }));
  }
  return renderPanel(lines.join("\n") || " ", width, {
    title: "行动选项",
    borderColor: "magenta",
    titleColor: "magenta",
  });
}
