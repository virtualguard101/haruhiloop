// 与 view.py make_scene_selector_panel + make_choice_selector_panel 1:1 对齐。
// 双行版（label + 描述）保留原 Python TUI 的视觉；
// 紧凑版把 label 与描述合并到同一行，去掉行间空行，省 2/3 行高，
// 用于浏览器视窗装不下时降级。

import { Scene, SceneChoice } from "../../../domain/models";
import { renderPanel } from "./panel";
import { wrap } from "./ansi";

export function renderSceneSelector(
  scenes: readonly Scene[],
  highlightIndex: number | null,
  width: number,
  compact = false,
): string[] {
  const lines: string[] = [];
  if (scenes.length === 0) {
    lines.push(wrap("当前时段暂无可用场景。", { dim: true }));
  }
  scenes.forEach((scene, i) => {
    const idx = i + 1;
    const selected = highlightIndex === idx;
    if (compact) {
      const text = `[${idx}] ${scene.label} — ${scene.description}`;
      const prefix = selected ? "▶ " : "  ";
      lines.push(
        selected
          ? wrap(prefix + text, { bold: true, reverse: true })
          : prefix + text,
      );
    } else {
      if (selected) {
        lines.push(wrap(`▶ [${idx}] ${scene.label}`, { bold: true, reverse: true }));
        lines.push(wrap(`   ${scene.description}`, { bold: true, reverse: true }));
      } else {
        lines.push(`  [${idx}] ${scene.label}`);
        lines.push(`     ${scene.description}`);
      }
      lines.push("");
    }
  });
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
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
      wrap(`当前场景：${sceneLabel}  ·  数字键选中，Enter 确认，r 重置`, { dim: true }),
    );
  } else {
    lines.push(wrap(`当前场景：${sceneLabel}`, { dim: true }));
    lines.push("");
  }
  if (choices.length === 0) {
    lines.push(wrap("请先选择场景。", { dim: true }));
  }
  choices.forEach((choice, i) => {
    const idx = i + 1;
    const selected = highlightIndex === idx;
    if (compact) {
      const text = `[${idx}] ${choice.label} — ${choice.description}`;
      const prefix = selected ? "▶ " : "  ";
      lines.push(
        selected
          ? wrap(prefix + text, { bold: true, reverse: true })
          : prefix + text,
      );
    } else {
      if (selected) {
        lines.push(wrap(`▶ [${idx}] ${choice.label}`, { bold: true, reverse: true }));
        lines.push(wrap(`   ${choice.description}`, { bold: true, reverse: true }));
      } else {
        lines.push(`  [${idx}] ${choice.label}`);
        lines.push(`     ${choice.description}`);
      }
      lines.push("");
    }
  });
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (!compact) {
    lines.push(wrap("数字键选中，Enter 确认，r 重置。", { dim: true }));
  }
  return renderPanel(lines.join("\n") || " ", width, {
    title: "行动选项",
    borderColor: "magenta",
    titleColor: "magenta",
  });
}
