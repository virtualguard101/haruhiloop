// 与 src/haruhiloop_cli/interfaces/cli/commands.py 1:1 对齐：
// start / step / status / history / replay / simulate 6 个命令。
// 用 xterm.js 自带 readline 体验：用户输入命令字符串，分发到对应 handler。

import type { Terminal } from "@xterm/xterm";
import { GameService } from "../../application/game_service";
import { formatEndingSummary } from "../../narrative/i18n";
import {
  renderHistoryTable,
  renderReplayBody,
} from "../tui/render/history";
import {
  renderMetricTable,
  renderMetricTableHybrid,
} from "../tui/render/status";
import { renderStepPanel } from "../tui/render/step";
import { renderPanel } from "../tui/render/panel";
import { renderTable } from "../tui/render/table";
import { wrap } from "../tui/render/ansi";

const PROMPT = "haruhi> ";

export class CliApp {
  private service = new GameService();
  private buffer = "";
  private hudMode: HTMLElement | null;

  constructor(private term: Terminal, hudMode: HTMLElement | null) {
    this.hudMode = hudMode;
  }

  async start(): Promise<void> {
    this.printIntro();
    this.term.onData((data) => this.handleData(data));
    if (this.hudMode) this.hudMode.textContent = "CLI";
    this.writePrompt();
  }

  private printIntro(): void {
    const cols = Math.max(60, this.term.cols - 2);
    const body = [
      `${wrap("Haruhi Loop CLI", { bold: true, fg: "cyan" })} — 终端版命令模式`,
      "",
      "命令：start [run_id] [--mutator-mode ai|deterministic] [--seed N] [--ai-temperature 0.0-1.5]",
      "      step <run_id> --scene <场景> --choice <选项>",
      "      status <run_id>",
      "      history <run_id> [--last N]",
      "      replay <run_id>",
      "      simulate [--runs N] [--max-steps N] [--policy random|greedy] [--mutator-mode ...] [--seed N]",
      "      clear        清屏",
      "      mode play    切换到 TUI 模式（刷新页面到 ?mode=play）",
      "",
      wrap("场景与选项可填序号或中文名。", { dim: true }),
    ].join("\n");
    const lines = renderPanel(body, cols, {
      title: "命令行模式",
      borderColor: "cyan",
      titleColor: "cyan",
    });
    this.term.write(lines.join("\r\n") + "\r\n\r\n");
  }

  private writePrompt(): void {
    this.term.write(`\r\n${wrap(PROMPT, { fg: "bright_cyan", bold: true })}`);
  }

  private handleData(data: string): void {
    for (const ch of data) {
      const code = ch.charCodeAt(0);
      if (ch === "\r") {
        this.term.write("\r\n");
        const cmd = this.buffer.trim();
        this.buffer = "";
        if (cmd) {
          void this.runCommand(cmd).then(() => this.writePrompt()).catch((err) => {
            this.writeError((err as Error).message);
            this.writePrompt();
          });
        } else {
          this.writePrompt();
        }
      } else if (code === 0x7f || code === 0x08) {
        if (this.buffer.length > 0) {
          this.buffer = this.buffer.slice(0, -1);
          this.term.write("\b \b");
        }
      } else if (code === 0x03) {
        // Ctrl+C
        this.buffer = "";
        this.term.write("^C");
        this.writePrompt();
      } else if (code >= 0x20) {
        this.buffer += ch;
        this.term.write(ch);
      }
    }
  }

  private writeError(msg: string): void {
    this.term.write(`\r\n${wrap("错误：" + msg, { fg: "red", bold: true })}\r\n`);
  }

  private writeOk(msg: string): void {
    this.term.write(`\r\n${wrap(msg, { fg: "green" })}\r\n`);
  }

  private async runCommand(line: string): Promise<void> {
    const tokens = tokenize(line);
    const cmd = (tokens.shift() ?? "").toLowerCase();
    if (!cmd) return;
    if (cmd === "clear") {
      this.term.reset();
      this.printIntro();
      return;
    }
    if (cmd === "mode") {
      const target = tokens[0]?.toLowerCase();
      if (target === "play") {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", "play");
        window.location.href = url.toString();
      }
      return;
    }
    if (cmd === "help" || cmd === "?") {
      this.printIntro();
      return;
    }
    switch (cmd) {
      case "start":
        await this.cmdStart(tokens);
        break;
      case "step":
        await this.cmdStep(tokens);
        break;
      case "status":
        await this.cmdStatus(tokens);
        break;
      case "history":
        await this.cmdHistory(tokens);
        break;
      case "replay":
        await this.cmdReplay(tokens);
        break;
      case "simulate":
        await this.cmdSimulate(tokens);
        break;
      default:
        this.writeError(`未知命令：${cmd}（输入 help 查看用法）`);
    }
  }

  private async cmdStart(tokens: string[]): Promise<void> {
    const opts = parseOptions(tokens);
    const positional = opts.positional;
    const mutatorMode =
      ((opts.flags["mutator-mode"] as "ai" | "deterministic") ?? "ai") ;
    if (mutatorMode !== "ai" && mutatorMode !== "deterministic") {
      this.writeError("mutator-mode 仅支持 deterministic 或 ai");
      return;
    }
    const seedRaw = opts.flags["seed"];
    const seed = seedRaw !== undefined ? Number(seedRaw) : null;
    const tempRaw = opts.flags["ai-temperature"];
    const temperature = tempRaw !== undefined ? Number(tempRaw) : 0.7;
    if (temperature < 0 || temperature > 1.5) {
      this.writeError("ai-temperature 必须在 0.0 到 1.5 之间");
      return;
    }
    const runId = positional[0] ?? makeRunId();
    const view = await this.service.startRun(runId, {
      mutatorMode,
      seed,
      aiTemperature: temperature,
    });
    const cols = this.cols();
    this.writeLines(renderMetricTable(view.state, cols));
    this.writeLines(this.renderScenesAndChoices(view, cols));
    this.writeOk(`已开始运行：${runId}`);
  }

  private async cmdStep(tokens: string[]): Promise<void> {
    const opts = parseOptions(tokens);
    const runId = opts.positional[0];
    if (!runId) {
      this.writeError("step 需要 run_id");
      return;
    }
    const scene = String(opts.flags["scene"] ?? "");
    const choice = String(opts.flags["choice"] ?? "");
    if (!scene || !choice) {
      this.writeError("step 必须同时提供 --scene 与 --choice");
      return;
    }
    const view = await this.service.stepRun(runId, scene, choice);
    const cols = this.cols();
    this.writeLines(renderStepPanel(view.result.record, false, cols));
    this.writeLines(renderMetricTable(view.result.state, cols));
    this.writeLines(this.renderScenesAndChoices(view, cols));
  }

  private async cmdStatus(tokens: string[]): Promise<void> {
    const opts = parseOptions(tokens);
    const runId = opts.positional[0];
    if (!runId) {
      this.writeError("status 需要 run_id");
      return;
    }
    const view = await this.service.status(runId);
    const cols = this.cols();
    this.writeLines(renderMetricTable(view.state, cols));
    this.writeLines(renderMetricTableHybrid(view.state, null, cols));
    this.writeLines(this.renderScenesAndChoices(view, cols));
  }

  private async cmdHistory(tokens: string[]): Promise<void> {
    const opts = parseOptions(tokens);
    const runId = opts.positional[0];
    if (!runId) {
      this.writeError("history 需要 run_id");
      return;
    }
    const last = opts.flags["last"] ?? opts.flags["n"];
    const records = await this.service.history(runId);
    const cols = this.cols();
    this.writeLines(renderHistoryTable(records, cols, last !== undefined ? Number(last) : undefined));
  }

  private async cmdReplay(tokens: string[]): Promise<void> {
    const opts = parseOptions(tokens);
    const runId = opts.positional[0];
    if (!runId) {
      this.writeError("replay 需要 run_id");
      return;
    }
    const { state, records } = await this.service.replay(runId);
    const cols = this.cols();
    this.writeLines(renderReplayBody(runId, state, records, cols));
  }

  private async cmdSimulate(tokens: string[]): Promise<void> {
    const opts = parseOptions(tokens);
    const runs = Number(opts.flags["runs"] ?? 50);
    const maxSteps = Number(opts.flags["max-steps"] ?? 30);
    const policyName =
      (opts.flags["policy"] as "random" | "greedy" | undefined) ?? "greedy";
    const mutatorMode =
      (opts.flags["mutator-mode"] as "ai" | "deterministic" | undefined) ?? "ai";
    if (runs <= 0) {
      this.writeError("模拟局数必须大于 0");
      return;
    }
    if (mutatorMode !== "ai" && mutatorMode !== "deterministic") {
      this.writeError("mutator-mode 仅支持 deterministic 或 ai");
      return;
    }
    if (policyName !== "random" && policyName !== "greedy") {
      this.writeError("--policy 仅支持 random 或 greedy");
      return;
    }
    const seedRaw = opts.flags["seed"];
    const seed = seedRaw !== undefined ? Number(seedRaw) : null;
    const tempRaw = opts.flags["ai-temperature"];
    const temperature = tempRaw !== undefined ? Number(tempRaw) : 0.7;
    if (temperature < 0 || temperature > 1.5) {
      this.writeError("ai-temperature 必须在 0.0 到 1.5 之间");
      return;
    }
    const summary = this.service.simulate({
      runs,
      maxSteps,
      policyName,
      mutatorMode,
      seed,
      aiTemperature: temperature,
    });
    this.term.write(`\r\n模拟局数：${summary.runs}\r\n`);
    this.term.write(`未在步数内结算的循环：${summary.unresolved}\r\n`);
    const sorted = Object.entries(summary.endings).sort((a, b) => b[1] - a[1]);
    for (const [endingId, count] of sorted) {
      const ratio = ((count / summary.runs) * 100).toFixed(1);
      const label = formatEndingSummary(endingId);
      this.term.write(`${label}：${count}（${ratio}%）\r\n`);
    }
  }

  private renderScenesAndChoices(
    view: { scenes: Array<{ label: string; description: string }>; choices: Array<{ label: string; description: string }>; selected_scene: { label: string } | null },
    cols: number,
  ): string[] {
    const sceneRows = view.scenes.map((s, i) => [String(i + 1), s.label, s.description]);
    const choiceRows = view.choices.map((c, i) => [String(i + 1), c.label, c.description]);
    const out: string[] = [];
    out.push(
      ...renderTable(
        {
          title: "可用场景（step 时 --scene 可填序号或中文名）",
          columns: [
            { header: "序号", align: "right" },
            { header: "场景" },
            { header: "说明" },
          ],
          rows: sceneRows,
          borderColor: "cyan",
          titleColor: "cyan",
        },
        cols,
      ),
    );
    out.push(
      ...renderTable(
        {
          title: `可用选项（当前场景：${view.selected_scene?.label ?? "—"}；--choice 可填序号或中文名）`,
          columns: [
            { header: "序号", align: "right" },
            { header: "选项" },
            { header: "说明" },
          ],
          rows: choiceRows,
          borderColor: "magenta",
          titleColor: "magenta",
        },
        cols,
      ),
    );
    return out;
  }

  private cols(): number {
    return Math.max(60, this.term.cols - 2);
  }

  private writeLines(lines: string[]): void {
    this.term.write(lines.join("\r\n") + "\r\n");
  }
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return out;
}

function parseOptions(tokens: string[]): {
  positional: string[];
  flags: Record<string, string>;
} {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.startsWith("--")) {
      const name = t.slice(2);
      const next = tokens[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[name] = "true";
      } else {
        flags[name] = next;
        i += 1;
      }
    } else if (t.startsWith("-") && t.length === 2) {
      const name = t.slice(1);
      const next = tokens[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[name] = "true";
      } else {
        flags[name] = next;
        i += 1;
      }
    } else {
      positional.push(t);
    }
  }
  return { positional, flags };
}

function makeRunId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
