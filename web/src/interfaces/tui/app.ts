// TUI 主应用：实现 entry / load / game / cheat 4 个屏幕模式，
// 数字键导航、Enter 确认、r/n/v/h/q 快捷键、kyon 秘籍序列、0.7s 脉冲。
// 与 src/haruhiloop_cli/play_app.py HaruhiPlayApp 行为对齐。

import type { Terminal } from "@xterm/xterm";

import { GameEngine, StepResult } from "../../domain/engine";
import {
  GameState,
  Scene,
  SceneChoice,
  StepCommand,
  StepRecord,
  fromSnapshot,
  isFinished,
  snapshot,
} from "../../domain/models";
import * as storage from "../../infrastructure/storage_idb";
import { SaveSlotSummary } from "../../infrastructure/storage_idb";
import { renderEntryPanel, loadEntryAscii } from "./render/entry";
import { renderLoadPanel, PAGE_SIZE, maxLoadPage } from "./render/load";
import {
  renderBreadcrumbPanel,
  renderClosedSpaceWarning,
  renderEndedNotice,
  renderHelpPanel,
  renderWelcomePanel,
} from "./render/help";
import {
  renderMetricTable,
  renderMetricTableHybrid,
  renderWorldlineStatusPanel,
} from "./render/status";
import { buildQuoteVisualState, renderQuotePanel } from "./render/quote";
import { renderSceneSelector, renderChoiceSelector } from "./render/selectors";
import { renderStepPanel } from "./render/step";
import { renderCheatPanel } from "./cheat";
import { wrap } from "./render/ansi";

const CHEAT_CODE = "kyon";
const TUI_DEFAULT_MUTATOR_MODE = "ai" as const;
const TUI_DEFAULT_AI_TEMPERATURE = 1.5;

type ScreenMode = "entry" | "load" | "game" | "cheat";

interface SetupOptions {
  terminal: Terminal;
  hudClock: HTMLElement;
  hudMode: HTMLElement;
}

export class TUIApp {
  private term: Terminal;
  private hudClock: HTMLElement;
  private hudMode: HTMLElement;

  private engine = new GameEngine();
  private state: GameState | null = null;
  private runId = "";
  private lastRecord: StepRecord | null = null;
  private welcomeDone = false;
  private helpVisible = false;
  private viewMode: "hybrid" | "numeric" = "hybrid";
  private selectedSceneId: string | null = null;
  private selectedSceneIndex: number | null = null;
  private selectedChoiceId: string | null = null;
  private selectedChoiceIndex: number | null = null;
  private previousStateForTrend: GameState | null = null;
  private kyonIdx = 0;
  private quotePhase = 0;
  private clockTick = 0;
  private transitionFrames = 0;
  private screenMode: ScreenMode = "entry";
  private slots: SaveSlotSummary[] = [];
  private loadPage = 0;
  private notice: string | null = null;
  private noticeTimer: number | null = null;
  private asciiArt = "";
  private lastFrame = "";

  constructor(opts: SetupOptions) {
    this.term = opts.terminal;
    this.hudClock = opts.hudClock;
    this.hudMode = opts.hudMode;
  }

  async start(): Promise<void> {
    this.asciiArt = await loadEntryAscii();
    await this.refreshSlots();
    // 切到 alternate screen buffer + 隐藏光标。
    // 在 normal screen 下，每次 \x1b[H 只回到 viewport 顶部，
    // 上一帧会被 xterm 推到 scrollback 里堆积；alt screen 没有 scrollback，
    // cursor-home 永远是缓冲区原点，原位覆盖才不会"历史叠加"。
    this.term.write("\x1b[?1049h\x1b[?25l\x1b[H\x1b[2J");
    window.addEventListener("beforeunload", () => {
      this.term.write("\x1b[?25h\x1b[?1049l");
    });
    // viewport 大小改变（resize / fit addon）后立刻全量重绘，
    // 让上一帧的残留被新尺寸覆盖。
    this.term.onResize(() => {
      this.lastFrame = "";
      this.refresh();
    });
    this.term.onKey((e) => this.handleKey(e.domEvent));
    setInterval(() => this.tick(), 700);
    setInterval(() => this.updateClock(), 1000);
    this.refresh();
    this.updateClock();
  }

  private updateClock(): void {
    const d = new Date();
    this.hudClock.textContent = d.toLocaleTimeString("zh-CN", { hour12: false });
  }

  private tick(): void {
    this.quotePhase = (this.quotePhase + 1) % 2;
    this.clockTick += 1;
    if (this.transitionFrames > 0) this.transitionFrames -= 1;
    // 仅 game 屏幕的 quote panel 依赖脉冲；entry / load / cheat 是静态画面，
    // 不必跟着 tick 重绘（writeLines 内部还有 frame diff 防回刷，双重保险）。
    if (this.screenMode === "game") {
      this.refresh();
    }
  }

  private setNotice(message: string, durationMs = 3000): void {
    this.notice = message;
    if (this.noticeTimer !== null) {
      clearTimeout(this.noticeTimer);
    }
    this.noticeTimer = window.setTimeout(() => {
      this.notice = null;
      this.noticeTimer = null;
      this.refresh();
    }, durationMs);
  }

  private async refreshSlots(): Promise<void> {
    try {
      this.slots = await storage.listSaveSlots();
    } catch {
      this.slots = [];
    }
    const max = maxLoadPage(this.slots);
    if (this.loadPage > max) this.loadPage = max;
  }

  private handleKey(ev: KeyboardEvent): void {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const ch = ev.key;
    if (this.screenMode === "cheat") {
      this.screenMode = "game";
      this.refresh();
      return;
    }
    if (this.screenMode === "entry") {
      if (ch >= "1" && ch <= "4") {
        const idx = parseInt(ch, 10);
        if (idx === 1) void this.actionNewGame();
        else if (idx === 2) void this.enterLoad();
        else if (idx === 3) this.actionToggleHelp();
        else if (idx === 4) this.actionQuit();
      }
      return;
    }
    if (this.screenMode === "load") {
      if (ch >= "1" && ch <= "9") {
        const idx = parseInt(ch, 10) - 1;
        const start = this.loadPage * PAGE_SIZE;
        const slot = this.slots[start + idx];
        if (slot) void this.loadRun(slot.run_id);
        return;
      }
      const low = ch.toLowerCase();
      if (low === "a") {
        if (this.loadPage > 0) {
          this.loadPage -= 1;
          this.refresh();
        }
        return;
      }
      if (low === "d") {
        const max = maxLoadPage(this.slots);
        if (this.loadPage < max) {
          this.loadPage += 1;
          this.refresh();
        }
        return;
      }
      if (low === "b" || ch === "Escape") {
        this.screenMode = "entry";
        this.refresh();
        return;
      }
      return;
    }

    // screenMode === "game"
    if (ch >= "1" && ch <= "9") {
      this.kyonIdx = 0;
      void this.handleNumber(parseInt(ch, 10));
      return;
    }
    if (ch === "Enter") {
      void this.actionConfirmStep();
      return;
    }
    const low = ch.toLowerCase();
    if (low === "r") {
      this.actionResetSelection();
      return;
    }
    if (low === "v") {
      this.actionToggleViewMode();
      return;
    }
    if (low === "h") {
      this.actionToggleHelp();
      return;
    }
    if (low === "q") {
      this.actionQuit();
      return;
    }
    if (low === "n" && this.kyonIdx === 3) {
      this.kyonIdx = 0;
      this.screenMode = "cheat";
      this.refresh();
      return;
    }
    if (low === "n") {
      void this.actionNewGame();
      return;
    }
    if (low.length === 1 && low >= "a" && low <= "z") {
      this.feedKyon(low);
    }
  }

  private feedKyon(low: string): void {
    if (this.kyonIdx >= 3) {
      this.kyonIdx = low === CHEAT_CODE[0] ? 1 : 0;
      return;
    }
    if (low === CHEAT_CODE[this.kyonIdx]) {
      this.kyonIdx += 1;
    } else {
      this.kyonIdx = low === CHEAT_CODE[0] ? 1 : 0;
    }
  }

  private async actionNewGame(): Promise<void> {
    const runId = makeRunId();
    this.runId = runId;
    this.state = this.engine.createNewState(runId, {
      mutatorMode: TUI_DEFAULT_MUTATOR_MODE,
      randomSeed: null,
      aiTemperature: TUI_DEFAULT_AI_TEMPERATURE,
    });
    this.lastRecord = null;
    this.welcomeDone = false;
    this.helpVisible = false;
    this.viewMode = "hybrid";
    this.resetSelection();
    this.previousStateForTrend = null;
    this.kyonIdx = 0;
    this.clockTick = 0;
    this.transitionFrames = 0;
    this.screenMode = "game";
    try {
      await storage.saveState(this.state);
    } catch (err) {
      this.setNotice(`存档失败：${(err as Error).message}`);
    }
    this.refresh();
  }

  private async enterLoad(): Promise<void> {
    await this.refreshSlots();
    this.screenMode = "load";
    this.refresh();
  }

  private async loadRun(runId: string): Promise<void> {
    try {
      const state = await storage.loadState(runId);
      const history = await storage.loadHistory(runId);
      this.runId = runId;
      this.state = state;
      this.lastRecord = history[history.length - 1] ?? null;
      this.welcomeDone = true;
      this.helpVisible = false;
      this.viewMode = "hybrid";
      this.resetSelection();
      this.previousStateForTrend = null;
      this.kyonIdx = 0;
      this.clockTick = 0;
      this.transitionFrames = 0;
      this.screenMode = "game";
      this.loadPage = 0;
      this.setNotice(`已加载存档：${runId}`, 3000);
      this.refresh();
    } catch (err) {
      this.setNotice(`加载存档失败：${(err as Error).message}`, 5000);
    }
  }

  private actionToggleHelp(): void {
    this.helpVisible = !this.helpVisible;
    this.refresh();
  }

  private actionToggleViewMode(): void {
    this.viewMode = this.viewMode === "hybrid" ? "numeric" : "hybrid";
    this.setNotice(`已切换为${this.viewMode === "hybrid" ? "混合叙事" : "详细数值"}视图`, 2500);
    this.refresh();
  }

  private actionResetSelection(): void {
    this.resetSelection();
    this.refresh();
  }

  private resetSelection(): void {
    this.selectedSceneId = null;
    this.selectedSceneIndex = null;
    this.selectedChoiceId = null;
    this.selectedChoiceIndex = null;
  }

  private actionQuit(): void {
    if (window.confirm("确定要关闭页面吗？（你的存档已保存在浏览器内）")) {
      window.close();
    }
  }

  private async handleNumber(idx: number): Promise<void> {
    if (!this.state || isFinished(this.state)) return;
    if (this.selectedSceneId === null) {
      const scenes = this.engine.availableScenes(this.state);
      if (idx >= 1 && idx <= scenes.length) {
        const s = scenes[idx - 1]!;
        this.selectedSceneId = s.scene_id;
        this.selectedSceneIndex = idx;
        this.selectedChoiceId = null;
        this.selectedChoiceIndex = null;
      }
    } else {
      const choices = this.engine.availableChoices(this.state, this.selectedSceneId);
      if (idx >= 1 && idx <= choices.length) {
        const c = choices[idx - 1]!;
        this.selectedChoiceId = c.choice_id;
        this.selectedChoiceIndex = idx;
      }
    }
    this.refresh();
  }

  private async actionConfirmStep(): Promise<void> {
    if (this.screenMode === "entry") {
      void this.actionNewGame();
      return;
    }
    if (this.screenMode === "load") return;
    if (!this.state) return;
    if (this.selectedSceneId === null || this.selectedChoiceId === null) return;
    if (isFinished(this.state)) return;

    const ok = await this.applyStep(this.selectedSceneId, this.selectedChoiceId);
    if (ok) {
      this.selectedChoiceId = null;
      this.selectedChoiceIndex = null;
    }
    this.refresh();
    if (this.state && isFinished(this.state) && this.state.ending_title) {
      this.setNotice(
        `结局：${this.state.ending_title}。完整剧情见上方面板「结局剧情」。`,
        14000,
      );
    }
  }

  private async applyStep(sceneId: string, choiceId: string): Promise<boolean> {
    if (!this.state) return false;
    if (isFinished(this.state)) {
      this.setNotice("本局已结束，按 n 开始新局");
      return false;
    }
    let history: StepRecord[] = [];
    try {
      history = await storage.loadHistory(this.runId);
    } catch {
      history = [];
    }
    const stepNo = history.length + 1;
    const prevDay = this.state.day;
    const prevLoop = this.state.loop_count;
    const previousState = fromSnapshot(snapshot(this.state));
    let result: StepResult;
    try {
      result = this.engine.step(
        this.state,
        { scene_id: sceneId, choice_id: choiceId } satisfies StepCommand,
        stepNo,
      );
    } catch (err) {
      this.setNotice((err as Error).message, 4000);
      return false;
    }
    this.previousStateForTrend = previousState;
    this.lastRecord = result.record;
    this.welcomeDone = true;
    try {
      await storage.appendHistory(this.runId, result.record);
      await storage.saveState(result.state);
    } catch (err) {
      this.setNotice(`存档失败：${(err as Error).message}`, 5000);
    }
    if (this.state.day !== prevDay || this.state.loop_count !== prevLoop) {
      this.transitionFrames = 2;
    }
    return true;
  }

  // ---- 渲染 ----

  private refresh(): void {
    const cols = Math.max(60, this.term.cols - 2);
    if (this.screenMode === "cheat") {
      this.writeLines(renderCheatPanel(cols));
      this.hudMode.textContent = "CHEAT";
      return;
    }
    if (this.screenMode === "entry") {
      const out: string[] = [];
      out.push(...renderEntryPanel(this.asciiArt, cols, this.term.rows));
      if (this.helpVisible) out.push(...renderHelpPanel(this.viewMode, cols));
      if (this.notice) out.push(...this.renderNotice(cols));
      // 顶部裁切兜底：超出 viewport 时优先保留底部菜单（按键操作所在）。
      const maxRows = Math.max(8, this.term.rows - 1);
      const trimmed = out.length > maxRows ? out.slice(out.length - maxRows) : out;
      this.writeLines(trimmed);
      this.hudMode.textContent = "ENTRY";
      return;
    }
    if (this.screenMode === "load") {
      const out = renderLoadPanel(this.slots, this.loadPage, cols);
      if (this.notice) out.push(...this.renderNotice(cols));
      const maxRows = Math.max(8, this.term.rows - 1);
      const trimmed = out.length > maxRows ? out.slice(out.length - maxRows) : out;
      this.writeLines(trimmed);
      this.hudMode.textContent = "LOAD";
      return;
    }
    // game
    if (!this.state) return;
    const scenes = this.engine.availableScenes(this.state);
    if (
      this.selectedSceneId &&
      !scenes.some((s) => s.scene_id === this.selectedSceneId)
    ) {
      this.selectedSceneId = scenes[0]?.scene_id ?? null;
      this.selectedSceneIndex = scenes.length > 0 ? 1 : null;
      this.selectedChoiceId = null;
      this.selectedChoiceIndex = null;
    }
    const choices: SceneChoice[] = this.selectedSceneId
      ? this.engine.availableChoices(this.state, this.selectedSceneId)
      : [];
    let selectedSceneLabel = "—";
    for (const s of scenes) {
      if (s.scene_id === this.selectedSceneId) {
        selectedSceneLabel = s.label;
        break;
      }
    }
    let selectedChoiceLabel = "未选择";
    if (this.selectedChoiceId) {
      for (const c of choices) {
        if (c.choice_id === this.selectedChoiceId) {
          selectedChoiceLabel = c.label;
          break;
        }
      }
    }
    const visual = buildQuoteVisualState(this.state, {
      pulsePhase: this.quotePhase,
      transitionFrames: this.transitionFrames,
      clockTick: this.clockTick,
    });
    const rows = this.term.rows;
    const finished = isFinished(this.state);
    const out: string[] = [];

    if (finished) {
      // 结局帧：剧情才是主角。worldline / quote / scene / choice 一律不再渲染，
      // 把 step panel（含完整结局剧情）+ metric 摘要 + ended notice 顶起来。
      if (this.helpVisible) out.push(...renderHelpPanel(this.viewMode, cols));
      if (this.lastRecord !== null) {
        out.push(
          ...renderStepPanel(this.lastRecord, this.viewMode === "hybrid", cols),
        );
      }
      if (this.viewMode === "hybrid") {
        out.push(
          ...renderMetricTableHybrid(this.state, this.previousStateForTrend, cols),
        );
      } else {
        out.push(...renderMetricTable(this.state, cols));
      }
      out.push(...renderEndedNotice(cols));
      if (this.notice) out.push(...this.renderNotice(cols));
    } else {
      // 进行中：按 viewport 高度做"分级降级"，避免 alt screen 下内容把顶部推出屏。
      const compact = rows < 50;
      const veryCompact = rows < 35;
      if (this.helpVisible) out.push(...renderHelpPanel(this.viewMode, cols));
      if (!veryCompact) {
        out.push(...renderWorldlineStatusPanel(visual, cols));
        out.push(...renderQuotePanel(visual, cols));
      }
      if (!this.welcomeDone && !compact) out.push(...renderWelcomePanel(cols));
      if (this.lastRecord !== null && !veryCompact) {
        out.push(
          ...renderStepPanel(this.lastRecord, this.viewMode === "hybrid", cols),
        );
      }
      if (this.viewMode === "hybrid") {
        out.push(
          ...renderMetricTableHybrid(this.state, this.previousStateForTrend, cols),
        );
      } else if (!veryCompact) {
        out.push(...renderMetricTable(this.state, cols));
      }
      if (this.state.closed_space_stage > 0) {
        out.push(...renderClosedSpaceWarning(cols));
      }
      if (!compact) {
        out.push(
          ...renderBreadcrumbPanel(selectedSceneLabel, selectedChoiceLabel, cols),
        );
      }
      out.push(
        ...renderSceneSelector(
          scenes as readonly Scene[],
          this.selectedSceneIndex,
          cols,
          compact,
        ),
      );
      out.push(
        ...renderChoiceSelector(
          choices,
          selectedSceneLabel,
          this.selectedChoiceIndex,
          cols,
          compact,
        ),
      );
      if (this.notice) out.push(...this.renderNotice(cols));
    }

    // 安全网：若仍超过 rows，从顶部裁掉超出部分（保留底部操作 / ended notice）。
    const maxRows = Math.max(8, rows - 1);
    const trimmed = out.length > maxRows ? out.slice(out.length - maxRows) : out;
    this.writeLines(trimmed);
    this.hudMode.textContent = `RUN ${this.runId} · ${this.viewMode === "hybrid" ? "HYBRID" : "NUMERIC"}`;
  }

  private renderNotice(cols: number): string[] {
    if (!this.notice) return [];
    const inner = wrap(`提示：${this.notice}`, { fg: "yellow", bold: true });
    return [inner.padEnd(Math.max(0, cols - 4))];
  }

  private writeLines(lines: string[]): void {
    // 原位覆盖：cursor-home，每行末尾清行尾，最后清屏剩余区域。
    // 这样不会触发 reset 引发的整屏白闪，可见的"重绘"只是字符替换。
    const frame = lines.join("\n");
    if (frame === this.lastFrame) return;
    this.lastFrame = frame;
    const body = lines.map((l) => l + "\x1b[K").join("\r\n");
    this.term.write("\x1b[H" + body + "\x1b[J");
  }
}

function makeRunId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
