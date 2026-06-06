// Panel/Entry 边框稳定性测试：杜绝"一行变多行 + 漂浮 ┃"的视觉破碎。

import { describe, it, expect } from "vitest";
import { renderPanel } from "../src/interfaces/tui/render/panel";
import { renderEntryPanel } from "../src/interfaces/tui/render/entry";
import { isWide, visibleWidth } from "../src/interfaces/tui/render/ansi";

function plain(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function vw(s: string): number {
  let w = 0;
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\x1b") {
      const j = s.indexOf("m", i);
      if (j === -1) break;
      i = j + 1;
      continue;
    }
    const cp = s.codePointAt(i)!;
    w += isWide(cp) ? 2 : 1;
    i += cp > 0xffff ? 2 : 1;
  }
  return w;
}

describe("renderPanel 边框稳定性", () => {
  it("普通短行：每行可见宽度等于 panel 总宽", () => {
    const lines = renderPanel("hello", 40, { title: "T", borderColor: "cyan" });
    for (const line of lines) {
      expect(vw(line)).toBe(40);
    }
  });

  it("空 body：至少 3 行（顶 + 1 内容 + 底），每行 ≤ 总宽", () => {
    const lines = renderPanel("", 30);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const line of lines) {
      expect(vw(line)).toBeLessThanOrEqual(30);
    }
  });

  it("超宽行不再产生多物理行（不会出现孤立右 ┃）", () => {
    // 一行内容宽度远大于 panel innerWidth，要求 panel 仍然只输出
    // 顶 + 1 内容 + 底 共 3 行（不再切多段）。
    const long = "あ".repeat(60); // 60 个全角 = 120 列
    const lines = renderPanel(long, 30, { borderColor: "magenta" });
    expect(lines.length).toBe(3);
    for (const line of lines) {
      expect(vw(line)).toBeLessThanOrEqual(30);
    }
  });

  it("含多段 \\n 的 body：每段对应一物理行，且每行可见宽度 = 总宽", () => {
    const body = "一\n二二\n三三三";
    const lines = renderPanel(body, 24);
    // 顶 + 3 内容 + 底
    expect(lines.length).toBe(5);
    for (const line of lines) expect(vw(line)).toBe(24);
  });

  it("超长 title 自动回退到无标题边框，避免顶边超宽", () => {
    const lines = renderPanel("x", 10, { title: "标题非常非常非常长" });
    expect(vw(lines[0]!)).toBe(10);
  });

  it("含 ANSI 颜色的内容：可见宽度计算忽略转义序列", () => {
    const colored = "\x1b[31m红色文本\x1b[0m";
    const lines = renderPanel(colored, 30);
    for (const line of lines) expect(vw(line)).toBe(30);
  });
});

describe("renderEntryPanel 边框稳定性", () => {
  // 单行 60 列宽的全角 ASCII art，便于触发"装不下"分支
  const wideAscii = "／".repeat(30) + "\n" + "＼".repeat(30);

  it("ASCII art 装得下时：所有行可见宽度 = panel 总宽", () => {
    const out = renderEntryPanel(wideAscii, 80, 60);
    for (const line of out) expect(vw(line)).toBe(80);
    // art 字符要出现
    expect(plain(out.join("\n"))).toContain("／");
  });

  it("窄 viewport 下 art 装不下：自动跳过 art，但 panel 边框仍每行齐整", () => {
    const out = renderEntryPanel(wideAscii, 40, 60);
    for (const line of out) expect(vw(line)).toBe(40);
    // 60 列 art 在 innerWidth=36 时装不下，应该被整体跳过，
    // 而不是被切成两行变成视觉错乱。
    expect(plain(out.join("\n"))).not.toContain("／");
  });

  it("默认输出含菜单 4 项与 SOS 团口号", () => {
    const txt = plain(renderEntryPanel(wideAscii, 80, 60).join("\n"));
    expect(txt).toContain("MAIN MENU");
    expect(txt).toContain("开始新局");
    expect(txt).toContain("载入存档");
    expect(txt).toContain("查看帮助");
    expect(txt).toContain("退出游戏");
    expect(txt).toContain("SOS");
  });
});

describe("isWide 与 visibleWidth", () => {
  it("常见字符宽度判定与 xterm Unicode 11 一致", () => {
    expect(isWide("A".codePointAt(0)!)).toBe(false);
    expect(isWide("　".codePointAt(0)!)).toBe(true); // U+3000
    expect(isWide("中".codePointAt(0)!)).toBe(true);
    expect(isWide("．".codePointAt(0)!)).toBe(true); // U+FF0E
    expect(isWide("ｦ".codePointAt(0)!)).toBe(false); // 半角片假名 U+FF66
    expect(isWide("―".codePointAt(0)!)).toBe(false); // U+2015 Ambiguous
    expect(isWide("∧".codePointAt(0)!)).toBe(false); // U+2227 Ambiguous
    expect(isWide("⌚".codePointAt(0)!)).toBe(true); // 表情类 Wide
  });

  it("含 Surrogate Pair 的 emoji（U+1F600）按 2 列", () => {
    expect(visibleWidth("😀")).toBe(2);
  });
});
