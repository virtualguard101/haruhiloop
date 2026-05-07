// 与 view.py make_classic_quote_panel + _apply_noise 1:1 对齐。
// 在 web 端额外补：上下各一行竖纹装饰、台词加粗居中，
// 营造"名台词从世界线断面浮出"的视觉。

import { GameState } from "../../../domain/models";
import { renderPanel } from "./panel";
import { centerInWidth, wrap } from "./ansi";

export const CLASSIC_QUOTE_JP = "過ぎ去った時間は、決して取り戻せないのよ";
const GLITCH_CHARS = "・＊※＋×";

export interface QuoteVisualState {
  pulse_phase: number;
  closed_space_stage: number;
  nagato_fatigue: number;
  transition_frames: number;
  clock_tick: number;
  worldline_shift: number;
  day: number;
  loop_count: number;
}

export function buildQuoteVisualState(
  state: GameState,
  visual: { pulsePhase: number; transitionFrames: number; clockTick: number },
): QuoteVisualState {
  return {
    pulse_phase: visual.pulsePhase,
    closed_space_stage: state.closed_space_stage,
    nagato_fatigue: state.nagato_fatigue,
    transition_frames: visual.transitionFrames,
    clock_tick: visual.clockTick,
    worldline_shift: state.worldline_shift,
    day: state.day,
    loop_count: state.loop_count,
  };
}

function applyNoise(text: string, noiseLevel: number, seed: number): string {
  if (noiseLevel <= 0) return text;
  const chars = [...text];
  const step = Math.max(4, 10 - noiseLevel * 2);
  for (let idx = ((seed + noiseLevel) % step + step) % step; idx < chars.length; idx += step) {
    if (chars[idx] !== " ") {
      chars[idx] = GLITCH_CHARS[((idx + seed) % GLITCH_CHARS.length + GLITCH_CHARS.length) % GLITCH_CHARS.length] ?? chars[idx]!;
    }
  }
  return chars.join("");
}

export function renderQuotePanel(visual: QuoteVisualState, width: number): string[] {
  let border = "magenta";
  if (visual.closed_space_stage >= 2) {
    border = visual.pulse_phase % 2 === 0 ? "red" : "bright_red";
  } else if (visual.pulse_phase % 2 === 1) {
    border = "bright_magenta";
  }
  const jpStyle = visual.pulse_phase % 2 === 0
    ? { italic: true, fg: "white", bold: true }
    : { italic: true, fg: "bright_white", bold: true };
  let noiseLevel = 0;
  if (visual.nagato_fatigue >= 85) noiseLevel = 3;
  else if (visual.nagato_fatigue >= 70) noiseLevel = 2;
  else if (visual.nagato_fatigue >= 55) noiseLevel = 1;

  const quoteText = applyNoise(CLASSIC_QUOTE_JP, noiseLevel, visual.clock_tick + visual.day);
  const driftLeft = visual.pulse_phase % 2 === 0 ? " " : "  ";
  const driftRight = visual.pulse_phase % 2 === 0 ? "  " : " ";
  const block = wrap(`${driftLeft}${quoteText}${driftRight}`, jpStyle);

  // panel 的 innerWidth = width - 2(border) - 2(padding)
  const innerWidth = Math.max(2, width - 4);
  // 上下用淡淡的 ▽ / △ 装饰，呼应"过去/未来"的时间感
  const ornamentChar = visual.pulse_phase % 2 === 0 ? "▽" : "△";
  const ornamentColor = visual.closed_space_stage >= 2 ? "bright_red" : "bright_magenta";
  const ornamentLine = wrap(
    " " + Array.from({ length: 9 }).map(() => ornamentChar).join(" ") + " ",
    { fg: ornamentColor, dim: true },
  );
  const top = centerInWidth(ornamentLine, innerWidth);
  const centered = centerInWidth(block, innerWidth);

  const title = visual.transition_frames > 0 ? "名台词 · WORLDLINE SHIFT" : "名台词";
  return renderPanel([top, centered, top].join("\n"), width, {
    title,
    borderColor: border,
    titleColor: border,
    align: "left",
  });
}
