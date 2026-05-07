import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { CanvasAddon } from "@xterm/addon-canvas";
import { WebglAddon } from "@xterm/addon-webgl";

import { TUIApp } from "./interfaces/tui/app";
import { CliApp } from "./interfaces/cli/commands";

const TERMINAL_THEME = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  cursor: "#cdd6f4",
  black: "#45475a",
  red: "#f38ba8",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  blue: "#89b4fa",
  magenta: "#cba6f7",
  cyan: "#94e2d5",
  white: "#cdd6f4",
  brightBlack: "#585b70",
  brightRed: "#f38ba8",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5",
  brightWhite: "#cdd6f4",
} as const;

function pickMode(): "play" | "cli" {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  return mode === "cli" ? "cli" : "play";
}

async function bootstrap(): Promise<void> {
  const host = document.getElementById("terminal");
  const hudClock = document.getElementById("hud-clock");
  const hudMode = document.getElementById("hud-mode");
  if (!host || !hudClock || !hudMode) {
    throw new Error("缺失必要 DOM 元素 #terminal / #hud-clock / #hud-mode");
  }

  const term = new Terminal({
    theme: TERMINAL_THEME,
    fontFamily: '"JetBrains Mono","Cascadia Code","Source Han Sans CN",monospace',
    // 同视窗高度装更多行 —— textual 渲染的 entry 屏 ASCII art + 菜单
    // 在 14pt/1.15 行高下需要 ~55 行，常见笔记本 viewport 高度装不下。
    // 12pt/1.0 → 单行 ~13 px，1080p viewport 可显示 ~72 行（vs 原 ~52）。
    fontSize: 12,
    lineHeight: 1.0,
    letterSpacing: 0,
    cursorBlink: false,
    cursorStyle: "bar",
    scrollback: 5000,
    disableStdin: false,
    allowProposedApi: true,
    convertEol: false,
    macOptionIsMeta: true,
  });

  const fit = new FitAddon();
  const unicode11 = new Unicode11Addon();
  term.loadAddon(fit);
  term.loadAddon(unicode11);
  // 把字符宽度判定切到 Unicode 11 表，覆盖更完整的 CJK / emoji /
  // 半角片假名等范围，避免内部 cell 宽度估算与渲染列数不一致。
  term.unicode.activeVersion = "11";
  term.open(host);

  // 关键：xterm v5 默认 DOM 渲染会让浏览器自由排版字符，Chrome 在
  // macOS 下 monospace fallback 到苹方等非严格等宽 CJK 字体，CJK
  // glyph 实际像素宽 > 2 cell，会"挤"右侧字符（包括 ┃ 边框）。
  // 改成 Canvas / WebGL 渲染：每个 cell 自己 fillRect 清屏后再画
  // glyph，CJK 字符即使 metrics 超 cell 也不会污染相邻 cell。
  // 优先 WebGL（性能 + 严格 cell），失败回退 Canvas。
  let webglOK = false;
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
    webglOK = true;
  } catch {
    webglOK = false;
  }
  if (!webglOK) {
    try {
      term.loadAddon(new CanvasAddon());
    } catch {
      // 最后兜底：保留默认 DOM 渲染。
    }
  }

  fit.fit();
  // 拖动窗口期间 'resize' 事件每 ~16 ms 触发一次。每次 fit() 都会
  // 计算字体度量并通知 onResize 链路 → 经 Pyodide → textual layout，
  // 单次 ~30–80 ms。如果不防抖，会串成长链路阻塞 UI。
  // 用 requestAnimationFrame 合并到下一帧 + 80 ms 末尾确保拖动结束的最终
  // 尺寸一定生效（rAF 在 Chrome 拖动 resize 节流时可能延迟很久）。
  let rafId: number | null = null;
  let tailId: number | null = null;
  const scheduleFit = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      fit.fit();
    });
    if (tailId !== null) clearTimeout(tailId);
    tailId = window.setTimeout(() => {
      tailId = null;
      fit.fit();
    }, 80);
  };
  window.addEventListener("resize", scheduleFit);

  const mode = pickMode();
  if (mode === "cli") {
    const app = new CliApp(term, hudMode);
    await app.start();
  } else {
    const app = new TUIApp({
      terminal: term,
      hudClock: hudClock,
      hudMode: hudMode,
    });
    await app.start();
  }
}

bootstrap().catch((err) => {
  document.body.innerText = `初始化失败：${(err as Error).message}`;
  console.error(err);
});
