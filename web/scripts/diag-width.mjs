// 诊断脚本：测量 entry panel / status / quote 中文本的 visibleWidth，
// 与几个常见终端宽度（80 / 100 / 120 / 160 / 200）对比，列出会触发 wrap 的行。
import { readFileSync } from "node:fs";

function isWide(cp) {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x2fffd) ||
    (cp >= 0x30000 && cp <= 0x3fffd)
  );
}
function visibleWidth(t) {
  let w = 0, i = 0;
  while (i < t.length) {
    if (t[i] === "\x1b") { const j = t.indexOf("m", i); if (j < 0) break; i = j + 1; continue; }
    const cp = t.codePointAt(i);
    w += isWide(cp) ? 2 : 1;
    i += cp > 0xffff ? 2 : 1;
  }
  return w;
}
const ascii = readFileSync(new URL("../public/assets/haruhi_ascii.txt", import.meta.url), "utf8")
  .replace(/^\n+|\n+$/g, "").split(/\r?\n/);
console.log("=== haruhi_ascii.txt 各行可见宽度 ===");
let max = 0;
ascii.forEach((l, i) => { const w = visibleWidth(l); max = Math.max(max, w); console.log(`#${(i+1).toString().padStart(2)} w=${w}  >> ${l}`); });
console.log(`MAX=${max}`);
console.log();
const samples = [
  "★ SOS 团 · 特别活动室终端 ★",
  "「ただの人間には興味ありません。」",
  "如果你是外星人、未来人、异世界人或超能力者，就来找我吧。",
  "无尽八月循环模拟器",
  "過ぎ去った時間は、決して取り戻せないのよ",
  "[1] 活动室 - SOS 团活动室，意见与情绪最容易正面碰撞。",
  "[2] 图书馆 - 静态调查场，长门路线与世界线证据主要来源。",
  "运行 3a6aed65 | 第 1 天 · 午后（混合叙事）",
  "稳定（上升）",
  "勉强对齐（上升）",
];
console.log("=== HUD/quote/选项样本 ===");
samples.forEach((s) => console.log(`w=${visibleWidth(s).toString().padStart(3)}  ${s}`));
console.log();
// 列出实际不在 isWide() 但 East Asian Wide 的常见字符（可能漏判）
console.log("=== 排查：ASCII art 中所有非 ASCII 字符的 cp ===");
const codeFreq = new Map();
ascii.join("").split("").forEach((ch) => {
  const cp = ch.codePointAt(0); if (cp < 0x80) return;
  const wide = isWide(cp);
  const key = `U+${cp.toString(16).toUpperCase().padStart(4,"0")} ${ch} wide=${wide}`;
  codeFreq.set(key, (codeFreq.get(key) ?? 0) + 1);
});
[...codeFreq.entries()].sort().forEach(([k, n]) => console.log(`${k} x${n}`));
