import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

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
    fontSize: 14,
    lineHeight: 1.15,
    letterSpacing: 0,
    cursorBlink: false,
    cursorStyle: "bar",
    scrollback: 5000,
    disableStdin: false,
    allowProposedApi: true,
    convertEol: false,
    macOptionIsMeta: true,
    rendererType: "canvas",
  } as ConstructorParameters<typeof Terminal>[0]);

  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(host);
  fit.fit();
  window.addEventListener("resize", () => {
    fit.fit();
  });

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
