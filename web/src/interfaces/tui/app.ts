// TUI 主应用：现在 ts 端只是 thin client。
//   - boot Pyodide → 启动完整 HaruhiPlayApp（Textual Pilot 模式跑在浏览器）
//   - 键盘事件 → driver.send_key
//   - 0.7s tick → driver.tick（驱动 quote pulse / clock 等定时器）
//   - resize → driver.resize
//   - 每次 send_key / tick / resize 后 → driver.render_frame() 拿整屏 ANSI
//     （含 Header / Footer / Screen $accent 黄边框 / Static#main 内容）
//     直接写入 xterm.js
//
// 这是与父项目终端 byte-for-byte 等同的真 1:1 还原 —— 渲染就是 Textual
// 在浏览器里跑出来的。

import type { Terminal } from "@xterm/xterm";

import {
  bootPyodide,
  pyodideReady,
  renderFrame,
  resize as pyResize,
  scroll as pyScroll,
  sendKey,
  tick as pyTick,
} from "./python_render";

interface SetupOptions {
  terminal: Terminal;
  hudClock: HTMLElement;
  hudMode: HTMLElement;
}

// ts ↔ textual 的按键名映射（textual.keys 风格）
function mapKey(ev: KeyboardEvent): string | null {
  const k = ev.key;
  if (k.length === 1) {
    return k.toLowerCase();
  }
  switch (k) {
    case "Enter":
      return "enter";
    case "Escape":
      return "escape";
    case "Backspace":
      return "backspace";
    case "Tab":
      return "tab";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
    case " ":
      return "space";
    case "PageUp":
      return "pageup";
    case "PageDown":
      return "pagedown";
    case "Home":
      return "home";
    case "End":
      return "end";
    default:
      return null;
  }
}

export class TUIApp {
  private term: Terminal;
  private hudClock: HTMLElement;
  private hudMode: HTMLElement;
  private lastFrame = "";
  private rendering = false;
  private renderQueued = false;
  // 拖动窗口时 fit() 会快速触发多次 onResize；我们只关心最终尺寸 ——
  // 这里收最新 pendingSize，串行循环里"取最新值再处理"。
  private pendingSize: { cols: number; rows: number } | null = null;
  private resizing = false;
  // wheel 累积：滚轮事件比按键密集，这里把 deltaY 攒起来 batch 给 textual。
  private wheelAccum = 0;
  private wheelProcessing = false;

  constructor(opts: SetupOptions) {
    this.term = opts.terminal;
    this.hudClock = opts.hudClock;
    this.hudMode = opts.hudMode;
  }

  async start(): Promise<void> {
    // alt screen + 隐光标
    this.term.write("\x1b[?1049h\x1b[?25l\x1b[H\x1b[2J");
    window.addEventListener("beforeunload", () => {
      this.term.write("\x1b[?25h\x1b[?1049l");
    });

    this.writeBootMessage("正在加载渲染引擎…");
    try {
      await bootPyodide(this.term.cols, this.term.rows, (stage, detail) => {
        this.writeBootMessage(`${stage}${detail ? `（${detail}）` : ""}`);
      });
    } catch (err) {
      this.writeBootMessage(
        `初始化失败：${(err as Error).message}\r\n` +
          "请检查网络（Pyodide 默认从 jsdelivr CDN 加载）。",
      );
      throw err;
    }

    this.term.onResize(({ cols, rows }) => {
      void this.handleResize(cols, rows);
    });
    this.term.onKey((e) => this.handleKey(e.domEvent));
    // 把鼠标滚轮转发给 textual 的 VerticalScroll —— textual 内部 #main
    // 是 VerticalScroll 容器，超长内容默认可滚动，但需要事件输入。
    const termEl = this.term.element ?? document.getElementById("terminal");
    termEl?.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        this.wheelAccum += ev.deltaY;
        void this.drainWheel();
      },
      { passive: false },
    );

    // tick: 驱动 textual 内部的 quote pulse / save_slots 刷新等定时器
    setInterval(() => {
      void this.tickAndRender();
    }, 700);
    setInterval(() => this.updateClock(), 1000);

    // boot 期间用户可能拖动了窗口；那期间 onResize 被 pyodideReady=false
    // 拒绝。这里 boot 完成后强制再同步一次当前真实尺寸。
    this.hudMode.textContent = "TEXTUAL";
    await this.handleResize(this.term.cols, this.term.rows);
    await this.renderOnce();
    this.updateClock();
  }

  private writeBootMessage(msg: string): void {
    const stamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    this.term.write(`\r\n  \x1b[2m[${stamp}]\x1b[0m \x1b[36m${msg}\x1b[0m`);
  }

  private updateClock(): void {
    const d = new Date();
    this.hudClock.textContent = d.toLocaleTimeString("zh-CN", { hour12: false });
  }

  private async handleKey(ev: KeyboardEvent): Promise<void> {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!pyodideReady()) return;
    const key = mapKey(ev);
    if (key === null) return;
    try {
      await sendKey(key);
    } catch (err) {
      console.error("[textual] send_key failed:", err);
      return;
    }
    await this.renderOnce();
  }

  private async handleResize(cols: number, rows: number): Promise<void> {
    if (!pyodideReady()) return;
    // 收最新尺寸；正在处理就让现役 loop 自己取最新值，不重复进入。
    this.pendingSize = { cols, rows };
    if (this.resizing) return;
    this.resizing = true;
    try {
      while (this.pendingSize) {
        const { cols: c, rows: r } = this.pendingSize;
        this.pendingSize = null;
        try {
          await pyResize(c, r);
        } catch (err) {
          console.error("[textual] resize failed:", err);
          continue;
        }
        this.lastFrame = "";
        await this.renderOnce();
      }
    } finally {
      this.resizing = false;
    }
  }

  private async drainWheel(): Promise<void> {
    if (!pyodideReady()) return;
    if (this.wheelProcessing) return;
    this.wheelProcessing = true;
    try {
      while (Math.abs(this.wheelAccum) >= 1) {
        const dy = this.wheelAccum;
        this.wheelAccum = 0;
        const direction = dy > 0 ? "down" : "up";
        // deltaY 一格 ~100；把它换算成行数（最少 1，最多 8）
        const amount = Math.min(8, Math.max(1, Math.round(Math.abs(dy) / 50)));
        try {
          await pyScroll(direction as "up" | "down", amount);
        } catch (err) {
          console.error("[textual] scroll failed:", err);
          break;
        }
        this.lastFrame = "";
        await this.renderOnce();
      }
    } finally {
      this.wheelProcessing = false;
    }
  }

  private async tickAndRender(): Promise<void> {
    if (!pyodideReady()) return;
    try {
      await pyTick(0.05);
    } catch {
      return;
    }
    await this.renderOnce();
  }

  private async renderOnce(): Promise<void> {
    if (!pyodideReady()) return;
    // 串行化：避免 Pyodide 单线程被并发 runPythonAsync 撞到一起
    if (this.rendering) {
      this.renderQueued = true;
      return;
    }
    this.rendering = true;
    try {
      const cols = this.term.cols;
      const rows = this.term.rows;
      const ansi = await renderFrame(cols, rows);
      this.writeAnsiFrame(ansi);
    } catch (err) {
      console.error("[textual] render failed:", err);
    } finally {
      this.rendering = false;
      if (this.renderQueued) {
        this.renderQueued = false;
        // 队列中的下一帧
        void this.renderOnce();
      }
    }
  }

  private writeAnsiFrame(ansi: string): void {
    if (!ansi) return;
    if (ansi === this.lastFrame) return;
    this.lastFrame = ansi;
    // Textual 的输出每行 \n 结尾；xterm 需要 \r\n。每行末尾清行尾，整帧结束清屏。
    const lines = ansi.replace(/\r?\n+$/g, "").split(/\r?\n/);
    const body = lines.map((l) => `${l}\x1b[K`).join("\r\n");
    this.term.write(`\x1b[H${body}\x1b[J`);
  }
}
